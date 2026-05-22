document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            calculIMC();
        });
    }
});

function calculIMC() {
    const poidsEl = document.getElementById('poids');
    const tailleEl = document.getElementById('taille');
    const resultat = document.getElementById('resultat');
    const poids = poidsEl ? parseFloat(String(poidsEl.value).replace(',', '.')) : NaN;
    const taille = tailleEl ? parseFloat(String(tailleEl.value).replace(',', '.')) : NaN;

    if (!isFinite(poids) || !isFinite(taille) || taille <= 0) {
        if (resultat) resultat.innerHTML = 'Veuillez saisir un poids et une taille valides.';
        return;
    }

    const imc = poids / Math.pow(taille, 2);
    let interpretation = '';
    if (imc < 16.5) {
        interpretation = 'dénutrition';
    } else if (imc < 18.5) {
        interpretation = 'maigreur';
    } else if (imc < 25) {
        interpretation = 'corpulence normale';
    } else if (imc < 30) {
        interpretation = 'surpoids';
    } else if (imc < 35) {
        interpretation = 'obésité modérée';
    } else if (imc < 40) {
        interpretation = 'obésité sévère';
    } else {
        interpretation = 'obésité morbide';
    }

    if (resultat) {
        resultat.innerHTML = `Votre IMC est : ${imc.toFixed(2)} <hr> ${interpretation}`;
    }
}
