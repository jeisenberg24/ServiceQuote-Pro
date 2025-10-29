/* Utility formatting */
function toCurrency(n) {
  if (!isFinite(n)) return '—';
  return `$${n.toFixed(0)}`;
}

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString();
}

/* Element helpers */
function el(id) { return document.getElementById(id); }
function setText(id, text) { el(id).textContent = text; }

/* Load saved defaults */
function loadSaved() {
  const saved = JSON.parse(localStorage.getItem('sq.defaults') || '{}');
  if (saved.marketRate != null) el('marketRate').value = saved.marketRate;
  if (saved.hours != null) el('hours').value = saved.hours;
  if (saved.travelHours != null) el('travelHours').value = saved.travelHours;
  if (saved.materials != null) el('materials').value = saved.materials;
  if (saved.equipment != null) el('equipment').value = saved.equipment;
  if (saved.complexity) el('complexity').value = saved.complexity;
  if (saved.experience) el('experience').value = saved.experience;
  if (saved.marketDemand) el('marketDemand').value = saved.marketDemand;
  if (saved.season) el('season').value = saved.season;
  if (saved.timeOfDay) el('timeOfDay').value = saved.timeOfDay;
  if (saved.emergency != null) el('emergency').checked = !!saved.emergency;
}

function saveDefaults() {
  const payload = {
    marketRate: Number(el('marketRate').value || 0),
    hours: Number(el('hours').value || 0),
    travelHours: Number(el('travelHours').value || 0),
    materials: Number(el('materials').value || 0),
    equipment: Number(el('equipment').value || 0),
    complexity: el('complexity').value,
    experience: el('experience').value,
    marketDemand: el('marketDemand').value,
    season: el('season').value,
    timeOfDay: el('timeOfDay').value,
    emergency: el('emergency').checked
  };
  localStorage.setItem('sq.defaults', JSON.stringify(payload));
}

/* Calculation Logic */
function calculateQuote(inputs) {
  const {
    marketRate, hours, travelHours, materials, equipment,
    complexity, experience, marketDemand, season, timeOfDay,
    emergency, competitor
  } = inputs;

  const travelRate = marketRate * 0.5; // travel valued at 50% of labor
  const laborBase = marketRate * hours;
  const experienceAdj = laborBase * (Number(experience) - 1);
  const complexityAdj = (laborBase + experienceAdj) * (Number(complexity) - 1);
  const travelCost = travelHours * travelRate;

  // Multipliers
  let subtotal = laborBase + experienceAdj + complexityAdj + travelCost + materials + equipment;
  subtotal *= Number(marketDemand);
  subtotal *= Number(season);
  subtotal *= Number(timeOfDay);
  if (emergency) subtotal *= 1.3; // base emergency uplift

  // Company overhead + profit margin heuristic (15%)
  const overhead = subtotal * 0.15;
  const estimate = subtotal + overhead;

  // Price range heuristics; if competitor given, anchor around competitor a bit
  let min = estimate * 0.92;
  let max = estimate * 1.12;
  if (competitor && competitor > 0) {
    const weight = 0.25; // blend towards competitor
    const blended = estimate * (1 - weight) + competitor * weight;
    min = blended * 0.95;
    max = blended * 1.07;
  }

  // Tiers
  const tierBasic = estimate * 0.9;
  const tierPremium = estimate * 1.2;
  const tierEmergency = estimate * (emergency ? 1.5 : 1.3);

  const breakdown = [
    ['Labor base', toCurrency(laborBase)],
    ['Experience adj', toCurrency(experienceAdj)],
    ['Complexity adj', toCurrency(complexityAdj)],
    ['Travel cost', toCurrency(travelCost)],
    ['Materials', toCurrency(materials)],
    ['Equipment', toCurrency(equipment)],
    ['Demand x ' + Number(marketDemand).toFixed(2), '×'],
    ['Season x ' + Number(season).toFixed(2), '×'],
    ['Time x ' + Number(timeOfDay).toFixed(2), '×'],
    [emergency ? 'Emergency uplift' : 'No emergency', emergency ? '× 1.30' : '—'],
    ['Overhead & margin (15%)', toCurrency(overhead)],
  ];

  return {
    estimate,
    min,
    max,
    tierBasic,
    tierPremium,
    tierEmergency,
    breakdown,
    validity: todayPlus(14)
  };
}

function onCalculate(e) {
  e.preventDefault();
  const inputs = {
    marketRate: Number(el('marketRate').value || 0),
    hours: Number(el('hours').value || 0),
    travelHours: Number(el('travelHours').value || 0),
    materials: Number(el('materials').value || 0),
    equipment: Number(el('equipment').value || 0),
    complexity: el('complexity').value,
    experience: el('experience').value,
    marketDemand: el('marketDemand').value,
    season: el('season').value,
    timeOfDay: el('timeOfDay').value,
    emergency: el('emergency').checked,
    competitor: Number(el('competitor').value || 0)
  };

  // basic validation
  if (inputs.marketRate <= 0 || inputs.hours < 0) {
    alert('Please enter a valid market rate and hours.');
    return;
  }

  const result = calculateQuote(inputs);
  setText('estimate', toCurrency(result.estimate));
  setText('range', `${toCurrency(result.min)} - ${toCurrency(result.max)}`);
  setText('validity', result.validity);
  setText('tier-basic', toCurrency(result.tierBasic));
  setText('tier-premium', toCurrency(result.tierPremium));
  setText('tier-emergency', toCurrency(result.tierEmergency));

  const list = el('breakdown');
  list.innerHTML = '';
  for (const [k, v] of result.breakdown) {
    const li = document.createElement('li');
    const s1 = document.createElement('span');
    s1.className = 'k';
    s1.textContent = k;
    const s2 = document.createElement('span');
    s2.className = 'v';
    s2.textContent = v;
    li.appendChild(s1);
    li.appendChild(s2);
    list.appendChild(li);
  }
}

function onReset() {
  el('quote-form').reset();
  setText('estimate', '—');
  setText('range', '—');
  setText('validity', '—');
  setText('tier-basic', '—');
  setText('tier-premium', '—');
  setText('tier-emergency', '—');
  el('breakdown').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  setText('year', String(new Date().getFullYear()));
  loadSaved();
  el('quote-form').addEventListener('submit', onCalculate);
  el('btn-reset').addEventListener('click', onReset);
  el('btn-save').addEventListener('click', () => { saveDefaults(); alert('Saved defaults.'); });
  el('btn-load').addEventListener('click', () => { loadSaved(); alert('Loaded saved values.'); });
});


