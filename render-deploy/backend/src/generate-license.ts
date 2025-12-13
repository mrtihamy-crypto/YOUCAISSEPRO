import { getMachineId, generateLicense, checkLicense, saveLicense } from './utils/license';

console.log('═══════════════════════════════════════════════════════');
console.log('  GÉNÉRATEUR DE LICENCE - YOU CAISSE PRO');
console.log('═══════════════════════════════════════════════════════\n');

// Récupérer l'ID de cette machine
const machineId = getMachineId();
console.log('🖥️  ID de cette machine:');
console.log(`   ${machineId}\n`);

// Générer une licence pour cette machine (valide 1 an)
const license = generateLicense(machineId, 365);
console.log('🔑 Licence générée:');
console.log(`   ${license}\n`);

// Sauvegarder la licence
const saved = saveLicense(license);
if (saved) {
  console.log('✅ Licence sauvegardée avec succès!\n');
} else {
  console.log('❌ Erreur lors de la sauvegarde de la licence\n');
}

// Vérifier la licence
const check = checkLicense();
console.log(check.message);
console.log('\n═══════════════════════════════════════════════════════');
console.log('⚠️  IMPORTANT: Gardez cette clé de licence en sécurité!');
console.log('   Elle est liée à CET ordinateur uniquement.');
console.log('═══════════════════════════════════════════════════════');
