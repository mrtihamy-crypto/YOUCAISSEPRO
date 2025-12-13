import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Clé secrète (à garder privée !)
const SECRET_KEY = 'YOUR_SECRET_KEY_CHANGE_THIS_2024_UNIQUE';

// Générer un identifiant unique de la machine
export function getMachineId(): string {
  const networkInterfaces = os.networkInterfaces();
  const macs: string[] = [];
  
  for (const name of Object.keys(networkInterfaces)) {
    const nets = networkInterfaces[name];
    if (nets) {
      for (const net of nets) {
        // Ignorer les adresses locales et virtuelles
        if (!net.internal && net.mac !== '00:00:00:00:00:00') {
          macs.push(net.mac);
        }
      }
    }
  }
  
  // Combiner MAC address + hostname + CPU
  const cpuInfo = os.cpus()[0]?.model || '';
  const hostname = os.hostname();
  const machineString = `${macs.sort().join('-')}-${hostname}-${cpuInfo}`;
  
  // Hasher pour créer un ID unique
  return crypto.createHash('sha256').update(machineString).digest('hex');
}

// Générer une clé de licence pour une machine spécifique
export function generateLicense(machineId: string, expiryDays: number = 365): string {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  
  const licenseData = {
    machineId,
    expiryDate: expiryDate.toISOString(),
    generatedAt: new Date().toISOString()
  };
  
  const licenseString = JSON.stringify(licenseData);
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(licenseString)
    .digest('hex');
  
  const license = Buffer.from(`${licenseString}:${signature}`).toString('base64');
  return license;
}

// Vérifier la licence
export function verifyLicense(license: string): { valid: boolean; error?: string; expiryDate?: Date } {
  try {
    const decoded = Buffer.from(license, 'base64').toString('utf8');
    const [licenseString, signature] = decoded.split(':');
    
    // Vérifier la signature
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(licenseString)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Licence invalide ou altérée' };
    }
    
    const licenseData = JSON.parse(licenseString);
    const currentMachineId = getMachineId();
    
    // Vérifier l'ID de la machine
    if (licenseData.machineId !== currentMachineId) {
      return { valid: false, error: 'Cette licence n\'est pas valide pour cet ordinateur' };
    }
    
    // Vérifier l'expiration
    const expiryDate = new Date(licenseData.expiryDate);
    if (expiryDate < new Date()) {
      return { valid: false, error: 'Licence expirée', expiryDate };
    }
    
    return { valid: true, expiryDate };
  } catch (error) {
    return { valid: false, error: 'Format de licence invalide' };
  }
}

// Sauvegarder la licence
export function saveLicense(license: string): boolean {
  try {
    const licenseDir = path.join(process.cwd(), '.license');
    if (!fs.existsSync(licenseDir)) {
      fs.mkdirSync(licenseDir, { recursive: true });
    }
    
    const licensePath = path.join(licenseDir, 'license.key');
    fs.writeFileSync(licensePath, license, 'utf8');
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la licence:', error);
    return false;
  }
}

// Charger la licence
export function loadLicense(): string | null {
  try {
    const licensePath = path.join(process.cwd(), '.license', 'license.key');
    if (fs.existsSync(licensePath)) {
      return fs.readFileSync(licensePath, 'utf8');
    }
    return null;
  } catch (error) {
    console.error('Erreur lors du chargement de la licence:', error);
    return null;
  }
}

// Créer une licence d'essai de 15 jours
function createTrialLicense(): string {
  const machineId = getMachineId();
  return generateLicense(machineId, 15); // 15 jours d'essai
}

// Vérifier la licence au démarrage
export function checkLicense(): { valid: boolean; message: string } {
  let license = loadLicense();
  
  // Si aucune licence, créer automatiquement une licence d'essai de 15 jours
  if (!license) {
    console.log('🎁 Première utilisation détectée - Activation de la période d\'essai gratuite (15 jours)');
    license = createTrialLicense();
    saveLicense(license);
  }
  
  const verification = verifyLicense(license);
  
  if (!verification.valid) {
    return {
      valid: false,
      message: `❌ ${verification.error}\n   📞 Contactez le support pour obtenir une licence complète.\n   📧 Email: support@youcaisse.pro`
    };
  }
  
  const daysLeft = Math.ceil((verification.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (daysLeft <= 15) {
    // C'est une version d'essai
    if (daysLeft <= 3) {
      return {
        valid: true,
        message: `⚠️  VERSION D'ESSAI - Il reste ${daysLeft} jour(s)!\n   Contactez le support pour activer la version complète.`
      };
    }
    return {
      valid: true,
      message: `🎁 VERSION D'ESSAI GRATUITE - ${daysLeft} jour(s) restant(s)`
    };
  }
  
  return {
    valid: true,
    message: `✅ Licence valide (expire dans ${daysLeft} jours)`
  };
}
