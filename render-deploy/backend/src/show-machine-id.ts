import { getMachineId } from './utils/license';

console.log('\n═══════════════════════════════════════════════════════');
console.log('    IDENTIFIANT MACHINE (MACHINE ID)');
console.log('═══════════════════════════════════════════════════════\n');

const machineId = getMachineId();

console.log('🖥️  MACHINE ID de cet ordinateur:');
console.log('─────────────────────────────────────────────────────');
console.log(machineId);
console.log('─────────────────────────────────────────────────────\n');
console.log('📧 Envoyez ce MACHINE ID au support pour obtenir');
console.log('   votre licence d\'activation.\n');
console.log('📞 Contact: support@youcaisse.pro\n');
