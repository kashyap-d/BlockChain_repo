// Frontend logic: Ethers.js v6 + MetaMask

// ABI of CertificateRegistry.sol
const CERT_TUPLE =
  "tuple(string certId, string studentName, string regNumber, string course, string grade, uint256 issueDate, address issuedBy, bool revoked, string revokeReason)";

const ABI = [
  "constructor(string _institutionName)",
  "function owner() view returns (address)",
  "function institutionName() view returns (string)",
  "function totalIssued() view returns (uint256)",
  "function totalRevoked() view returns (uint256)",
  "function isIssuer(address) view returns (bool)",
  "function addIssuer(address _issuer)",
  "function removeIssuer(address _issuer)",
  "function transferOwnership(address _newOwner)",
  "function issueCertificate(string _certId, string _studentName, string _regNumber, string _course, string _grade)",
  "function revokeCertificate(string _certId, string _reason)",
  "function verifyCertificate(string _certId) view returns (bool found, bool valid)",
  `function getCertificate(string _certId) view returns (${CERT_TUPLE})`,
  `function getCertificateByIndex(uint256 _index) view returns (${CERT_TUPLE})`,
  "function getCertificateCount() view returns (uint256)",
  "event IssuerAdded(address indexed issuer)",
  "event IssuerRemoved(address indexed issuer)",
  "event CertificateIssued(string certId, string studentName, address indexed issuedBy, uint256 issueDate)",
  "event CertificateRevoked(string certId, string reason, address indexed revokedBy)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
];

const STORAGE_KEY = "certichain.contractAddress";

let provider = null;
let signer = null;
let account = null;
let contract = null;   // connected to signer (for transactions)

const $ = (id) => document.getElementById(id);

// helpers
function short(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(ts) {
  return new Date(Number(ts) * 1000).toLocaleString();
}

function log(message, type = "info") {
  const li = document.createElement("li");
  li.className = type;
  li.innerHTML = `<time>${new Date().toLocaleTimeString()}</time>${message}`;
  $("log").prepend(li);
}

// Extracts the revert reason from the error ethers/MetaMask returns
function errorReason(err) {
  if (!err) return "Unknown error";
  if (err.code === "ACTION_REJECTED" || err.code === 4001) return "Transaction rejected in MetaMask";
  if (err.reason) return err.reason;
  if (err.revert && err.revert.args && err.revert.args.length) return err.revert.args[0];

  const candidates = [
    err.info?.error?.data?.message,
    err.info?.error?.message,
    err.error?.data?.message,
    err.error?.message,
    err.data?.message,
    err.shortMessage,
    err.message,
  ].filter(Boolean);

  for (const msg of candidates) {
    const m = msg.match(/reverted(?: with reason string)?:?\s*'?([^'\n]+)'?/i) || msg.match(/revert\s+([^\n]+)/i);
    if (m) return m[1].trim();
  }
  return candidates[0] || String(err);
}

function setBusy(form, busy) {
  form.querySelectorAll("button").forEach((b) => (b.disabled = busy));
}

// wallet
async function connectWallet() {
  if (!window.ethereum) {
    log("MetaMask not detected. Install the MetaMask extension and reload.", "bad");
    alertBox("MetaMask not detected. Please install MetaMask.");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = await signer.getAddress();

    const net = await provider.getNetwork();
    const chainId = Number(net.chainId);
    const onGanache = EXPECTED_CHAIN_IDS.includes(chainId);
    $("networkBadge").textContent = `Chain ${chainId}${onGanache ? " · Ganache" : ""}`;
    $("networkBadge").className = `badge ${onGanache ? "ok" : "bad"}`;
    $("account").textContent = `Wallet: ${account}`;
    $("connectBtn").textContent = short(account);
    log(`Connected MetaMask account <span class="mono">${account}</span> on chain ${chainId}`, "ok");
    if (!onGanache) log(`Warning: chain ${chainId} is not Ganache (expected ${EXPECTED_CHAIN_IDS.join(" / ")}).`, "bad");

    const saved = $("contractAddress").value.trim();
    if (saved) await loadContract();
  } catch (err) {
    log(`Wallet connection failed: ${escapeHtml(errorReason(err))}`, "bad");
  }
}

function alertBox(msg) {
  const r = $("verifyResult");
  r.className = "result invalid";
  r.innerHTML = `<strong>${escapeHtml(msg)}</strong>`;
}

// contract
async function loadContract() {
  const address = $("contractAddress").value.trim();
  if (!provider) return log("Connect MetaMask first.", "bad");
  if (!ethers.isAddress(address)) return log("Please enter a valid contract address.", "bad");

  const code = await provider.getCode(address);
  if (code === "0x") return log(`No contract found at ${address} on this network. Did you deploy to Ganache and select the same network in MetaMask?`, "bad");

  try { localStorage.setItem(STORAGE_KEY, address); } catch (_) {}
  if (contract) contract.removeAllListeners();   // avoid duplicate listeners
  contract = new ethers.Contract(address, ABI, signer);
  log(`Loaded contract at <span class="mono">${address}</span>`, "info");

  contract.removeAllListeners();
  contract.on("CertificateIssued", (certId, name) => {
    log(`Event: CertificateIssued <b>${escapeHtml(certId)}</b> for ${escapeHtml(name)}`, "ok");
    refreshAll();
  });
  contract.on("CertificateRevoked", (certId, reason) => {
    log(`Event: CertificateRevoked <b>${escapeHtml(certId)}</b> – ${escapeHtml(reason)}`, "info");
    refreshAll();
  });

  await refreshAll();
}

async function refreshAll() {
  if (!contract) return;
  try {
    const [name, issued, revoked, owner, issuer] = await Promise.all([
      contract.institutionName(),
      contract.totalIssued(),
      contract.totalRevoked(),
      contract.owner(),
      contract.isIssuer(account),
    ]);
    $("statInstitution").textContent = name;
    $("statIssued").textContent = issued.toString();
    $("statRevoked").textContent = revoked.toString();
    $("statOwner").textContent = owner;

    const isOwner = owner.toLowerCase() === account.toLowerCase();
    const role = isOwner ? "Owner" : issuer ? "Issuer" : "Verifier (public)";
    $("roleBadge").textContent = role;
    $("roleBadge").className = `badge ${isOwner || issuer ? "ok" : "info"}`;

    await renderTable();
  } catch (err) {
    log(`Could not read contract: ${escapeHtml(errorReason(err))}`, "bad");
  }
}

async function renderTable() {
  const count = Number(await contract.getCertificateCount());
  const tbody = $("certTable");
  if (count === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">No certificates issued yet.</td></tr>`;
    return;
  }
  const rows = await Promise.all([...Array(count).keys()].map((i) => contract.getCertificateByIndex(i)));
  tbody.innerHTML = rows
    .map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="mono">${escapeHtml(c.certId)}</td>
        <td>${escapeHtml(c.studentName)}</td>
        <td>${escapeHtml(c.regNumber)}</td>
        <td>${escapeHtml(c.course)}</td>
        <td>${escapeHtml(c.grade)}</td>
        <td>${fmtDate(c.issueDate)}</td>
        <td>${c.revoked
          ? `<span class="badge bad" title="${escapeHtml(c.revokeReason)}">Revoked</span>`
          : `<span class="badge ok">Valid</span>`}</td>
      </tr>`)
    .join("");
}

// Sends a transaction. Normally ethers simulates it first and stops reverting calls
// before MetaMask. With "Testing mode" on, it is sent anyway so the failure is mined.
async function sendTx(label, method, args) {
  if (!contract) {
    log("Load the contract first.", "bad");
    return;
  }
  const force = $("forceSend").checked;
  try {
    let expectedFailure = null;
    if (force) {
      try { await contract[method].staticCall(...args); }
      catch (e) { expectedFailure = errorReason(e); }
    }

    log(`${label}: waiting for MetaMask confirmation…`, "info");
    const tx = force
      ? await contract[method](...args, { gasLimit: 500000 })
      : await contract[method](...args);
    log(`${label}: submitted <span class="mono">${tx.hash}</span>`, "info");

    const receipt = await tx.wait();
    log(`${label}: ✅ success in block ${receipt.blockNumber}, gas used ${receipt.gasUsed}. Tx <span class="mono">${tx.hash}</span>`, "ok");
    await refreshAll();
    return true;
  } catch (err) {
    const hash = err.receipt?.hash || err.transactionHash || "";
    const reason = errorReason(err);
    log(`${label}: ❌ failed – <b>${escapeHtml(reason)}</b>${hash ? ` · Tx <span class="mono">${hash}</span>` : ""}`, "bad");
    // a mined failure has no reason, so show the simulated one
    if ($("forceSend").checked) {
      try { await contract[method].staticCall(...args); }
      catch (e) { log(`${label}: revert reason (simulated) – <b>${escapeHtml(errorReason(e))}</b>`, "bad"); }
    }
    await refreshAll();
    return false;
  }
}

// handlers
async function onVerify(e) {
  e.preventDefault();
  const form = e.target;
  const certId = form.certId.value.trim();
  const box = $("verifyResult");
  if (!contract) return log("Load the contract first.", "bad");

  setBusy(form, true);
  try {
    const [found, valid] = await contract.verifyCertificate(certId);
    box.classList.remove("hidden");
    if (!found) {
      box.className = "result invalid";
      box.innerHTML = `<h3>❌ Not found</h3>No certificate with ID <b>${escapeHtml(certId || "(empty)")}</b> exists on-chain. It may be forged.`;
      log(`Verify ${escapeHtml(certId || "(empty)")}: not found`, "bad");
      return;
    }
    const c = await contract.getCertificate(certId);
    box.className = `result ${valid ? "valid" : "invalid"}`;
    box.innerHTML = `
      <h3>${valid ? "✅ Authentic & valid" : "⚠️ Certificate revoked"}</h3>
      <dl>
        <dt>Certificate ID</dt><dd class="mono">${escapeHtml(c.certId)}</dd>
        <dt>Student</dt><dd>${escapeHtml(c.studentName)}</dd>
        <dt>Reg. number</dt><dd>${escapeHtml(c.regNumber)}</dd>
        <dt>Course</dt><dd>${escapeHtml(c.course)}</dd>
        <dt>Grade</dt><dd>${escapeHtml(c.grade)}</dd>
        <dt>Issued on</dt><dd>${fmtDate(c.issueDate)}</dd>
        <dt>Issued by</dt><dd class="mono">${c.issuedBy}</dd>
        ${c.revoked ? `<dt>Revoke reason</dt><dd>${escapeHtml(c.revokeReason)}</dd>` : ""}
      </dl>`;
    log(`Verify ${escapeHtml(certId)}: ${valid ? "valid" : "revoked"}`, valid ? "ok" : "bad");
  } catch (err) {
    log(`Verify failed: ${escapeHtml(errorReason(err))}`, "bad");
  } finally {
    setBusy(form, false);
  }
}

async function onIssue(e) {
  e.preventDefault();
  const f = e.target;
  // validation is done by the contract, so empty inputs are not blocked here
  const args = [f.certId, f.studentName, f.regNumber, f.course, f.grade].map((i) => i.value.trim());
  setBusy(f, true);
  const ok = await sendTx(`Issue ${escapeHtml(args[0] || "(empty id)")}`, "issueCertificate", args);
  setBusy(f, false);
  if (ok) f.reset();
}

async function onRevoke(e) {
  e.preventDefault();
  const f = e.target;
  const args = [f.certId.value.trim(), f.reason.value.trim()];
  setBusy(f, true);
  const ok = await sendTx(`Revoke ${escapeHtml(args[0] || "(empty id)")}`, "revokeCertificate", args);
  setBusy(f, false);
  if (ok) f.reset();
}

async function onIssuer(e) {
  e.preventDefault();
  const f = e.target;
  const action = e.submitter?.dataset.action || "add";
  const addr = f.address.value.trim();
  if (!contract) return log("Load the contract first.", "bad");
  if (!ethers.isAddress(addr)) return log(`"${escapeHtml(addr)}" is not a valid Ethereum address.`, "bad");

  if (action === "check") {
    const yes = await contract.isIssuer(addr);
    log(`${short(addr)} is ${yes ? "" : "<b>not</b> "}an authorized issuer`, yes ? "ok" : "info");
    return;
  }
  setBusy(f, true);
  await sendTx(`${action === "add" ? "Add" : "Remove"} issuer ${short(addr)}`, action === "add" ? "addIssuer" : "removeIssuer", [addr]);
  setBusy(f, false);
}

// init
window.addEventListener("DOMContentLoaded", () => {
  let saved = "";
  try { saved = localStorage.getItem(STORAGE_KEY) || ""; } catch (_) {}
  $("contractAddress").value = DEFAULT_CONTRACT_ADDRESS || saved;

  $("connectBtn").addEventListener("click", connectWallet);
  $("loadBtn").addEventListener("click", loadContract);
  $("refreshBtn").addEventListener("click", refreshAll);
  $("clearLogBtn").addEventListener("click", () => ($("log").innerHTML = ""));
  $("verifyForm").addEventListener("submit", onVerify);
  $("issueForm").addEventListener("submit", onIssue);
  $("revokeForm").addEventListener("submit", onRevoke);
  $("issuerForm").addEventListener("submit", onIssuer);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  } else {
    log("MetaMask not detected. Install it to interact with the DApp.", "bad");
  }
});
