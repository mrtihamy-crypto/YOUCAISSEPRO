import { generateLicense } from './utils/license';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('    GÉNÉRATEUR DE LICENCE POUR CLIENT');
  console.log('═══════════════════════════════════════════════════════\n');

  // Demander le Machine ID du client
  console.log('📋 Le client doit d\'abord vous envoyer son MACHINE ID');
  console.log('   Pour l\'obtenir, il doit exécuter: npm run show-machine-id\n');

  const machineId = await question('🔑 Entrez le MACHINE ID du client: ');
  
  if (!machineId || machineId.trim().length === 0) {
    console.error('\n❌ Machine ID invalide!');
    rl.close();
    process.exit(1);
  }

  const daysInput = await question('\n📅 Durée de la licence (jours) [365 par défaut]: ');
  const days = parseInt(daysInput) || 365;

  // Générer la licence
  const license = generateLicense(machineId.trim(), days);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ LICENCE GÉNÉRÉE AVEC SUCCÈS!');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('📦 LICENCE À ENVOYER AU CLIENT:');
  console.log('─────────────────────────────────────────────────────');
  console.log(license);
  console.log('─────────────────────────────────────────────────────\n');
  console.log('📧 Instructions pour le client:');
  console.log('   1. Créer le dossier: backend\\.license\\');
  console.log('   2. Créer le fichier: backend\\.license\\license.key');
  console.log('   3. Copier la licence ci-dessus dans ce fichier');
  console.log('   4. Relancer l\'application avec DEMARRER.bat\n');
  console.log(`⏰ Validité: ${days} jours\n`);

  rl.close();
}

main().catch(console.error);
