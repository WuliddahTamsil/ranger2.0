const fs = require('fs');
const path = require('path');

// 1. src/screens/pemilik_shop/Beranda.tsx
{
  const p = path.join(__dirname, '..', 'src', 'screens', 'pemilik_shop', 'Beranda.tsx');
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(
    /const showMessage = \(title: string, message: string\) => \{\r?\n\s+if \(Platform\.OS === "web"\) alert\(`\$\{title\}: \$\{message\}`\);\r?\n\s+else Alert\.alert\(title, message\);\r?\n\};/,
    'const showMessage = (title: string, message: string) => {\n  Alert.alert(title, message);\n};'
  );
  c = c.replace(
    /if \(Platform\.OS === "web"\) \{\r?\n\s+if \(window\.confirm\(`Hapus permanen \$\{product\.name\} dari katalog toko\?`\)\) \{\r?\n\s+void doDelete\(\);\r?\n\s+\}\r?\n\s+\} else \{\r?\n\s+Alert\.alert\(/,
    'Alert.alert('
  );
  // Match closing bracket of the else clause
  // In the file:
  //      Alert.alert(
  //        "Hapus Produk?",
  //        ...
  //        [
  //          { text: "Batal", style: "cancel" },
  //          { text: "Hapus Permanen", style: "destructive", onPress: () => void doDelete() },
  //        ]
  //      );
  //    }
  c = c.replace(
    /(\{\s+text:\s+"Hapus Permanen",\s+style:\s+"destructive",\s+onPress:\s+\(\)\s+=>\s+void doDelete\(\)\s+\},\r?\n\s+\]\r?\n\s+\);\r?\n\s+\})/,
    '$1'.replace(/\r?\n\s+\}$/, '')
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Processed shop/Beranda.tsx');
}

// 2. src/screens/customer/CustomerRideTrackingScreen.tsx
{
  const p = path.join(__dirname, '..', 'src', 'screens', 'customer', 'CustomerRideTrackingScreen.tsx');
  let c = fs.readFileSync(p, 'utf8');
  // In CustomerRideTrackingScreen.tsx:
  // if (Platform.OS === "web") {
  //   const feeNote = ...
  //   const confirmed = window.confirm(...)
  //   if (confirmed) { await executeCancelRide(...); return; }
  //   return;
  // }
  // setCancelModalVisible(true);
  c = c.replace(
    /if \(Platform\.OS === "web"\) \{\r?\n\s+const feeNote =\r?\n[\s\S]*?const confirmed = window\.confirm\([\s\S]*?\);\r?\n\s+if \(confirmed\) \{\r?\n\s+await executeCancelRide\("Dibatalkan oleh pelanggan via Web"\);\r?\n\s+return;\r?\n\s+\}\r?\n\s+return;\r?\n\s+\}/,
    `setCancelModalVisible(true);`
  );
  // Also replace window.alert with Alert.alert
  c = c.replace(/window\.alert\(/g, 'Alert.alert("Kanyaah Ride", ');
  fs.writeFileSync(p, c, 'utf8');
  console.log('Processed CustomerRideTrackingScreen.tsx');
}

// 3. src/screens/customer/CustomerRideScreen.tsx
{
  const p = path.join(__dirname, '..', 'src', 'screens', 'customer', 'CustomerRideScreen.tsx');
  let c = fs.readFileSync(p, 'utf8');
  // if (Platform.OS === "web") {
  //   const confirmed = window.confirm("Batalkan pesanan Kanyaah Ride aktif?");
  //   if (!confirmed) return;
  // }
  c = c.replace(
    /if \(Platform\.OS === "web"\) \{\r?\n\s+const confirmed = window\.confirm\("Batalkan pesanan Kanyaah Ride aktif\?"\);\r?\n\s+if \(!confirmed\) return;\r?\n\s+\}/,
    ''
  );
  c = c.replace(
    /if \(Platform\.OS === "web"\) \{\r?\n\s+window\.alert\("Pesanan perjalanan Anda telah dibatalkan\."\);\r?\n\s+\} else \{\r?\n\s+Alert\.alert\("Pesanan Dibatalkan", "Pesanan sebelumnya telah dibatalkan\. Anda dapat memesan kembali sekarang\."\);\r?\n\s+\}/,
    'Alert.alert("Pesanan Dibatalkan", "Pesanan sebelumnya telah dibatalkan. Anda dapat memesan kembali sekarang.");'
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Processed CustomerRideScreen.tsx');
}

// 4. src/components/AdminPgeInfoHubSection.tsx
{
  const p = path.join(__dirname, '..', 'src', 'components', 'AdminPgeInfoHubSection.tsx');
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(
    /if \(Platform\.OS === "web"\) \{\r?\n\s+if \(window\.confirm\(`Yakin ingin \$\{actionLabel\} materi "\$\{item\.title\}"\?`\)\) \{\r?\n\s+proceed\(\);\r?\n\s+\}\r?\n\s+\} else \{\r?\n\s+Alert\.alert\(/,
    'Alert.alert('
  );
  c = c.replace(
    /if \(Platform\.OS === "web"\) \{\r?\n\s+if \(window\.confirm\(`Hapus permanen materi "\$\{item\.title\}"\? Tindakan ini tidak dapat dibatalkan\.`\)\) \{\r?\n\s+proceed\(\);\r?\n\s+\}\r?\n\s+\} else \{\r?\n\s+Alert\.alert\(/,
    'Alert.alert('
  );
  // remove the trailing closing braces for the else
  fs.writeFileSync(p, c, 'utf8');
  console.log('Processed AdminPgeInfoHubSection.tsx');
}

// 5. src/components/MerchantVoucherManagementModal.tsx
{
  const p = path.join(__dirname, '..', 'src', 'components', 'MerchantVoucherManagementModal.tsx');
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(
    /if \(Platform\.OS === "web"\) \{\r?\n\s+if \(window\.confirm\(`Hapus voucher \$\{item\.voucherCode\}\?`\)\) \{\r?\n\s+void doDelete\(\);\r?\n\s+\}\r?\n\s+\} else \{\r?\n\s+Alert\.alert\(/,
    'Alert.alert('
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Processed MerchantVoucherManagementModal.tsx');
}

// 6. src/screens/customer/CustomerCateringDetailScreen.tsx
{
  const p = path.join(__dirname, '..', 'src', 'screens', 'customer', 'CustomerCateringDetailScreen.tsx');
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(
    /const showMessage = \(title: string, message: string\) => \{\r?\n\s+if \(Platform\.OS === "web"\) alert\(`\$\{title\}: \$\{message\}`\);\r?\n\s+else Alert\.alert\(title, message\);\r?\n\s+\};/,
    'const showMessage = (title: string, message: string) => {\n      Alert.alert(title, message);\n    };'
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Processed CustomerCateringDetailScreen.tsx');
}

// 7. src/components/ProfilePhotoEditor.tsx
{
  const p = path.join(__dirname, '..', 'src', 'components', 'ProfilePhotoEditor.tsx');
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(
    /if \(Platform\.OS === "web"\) window\.alert\(message\);\r?\n\s+else Alert\.alert\("Peringatan", message\);/,
    'Alert.alert("Peringatan", message);'
  );
  c = c.replace(
    /if \(Platform\.OS === "web"\) window\.alert\("Foto profil berhasil diperbarui\."\);\r?\n\s+else Alert\.alert\("Sukses", "Foto profil berhasil diperbarui\."\);/,
    'Alert.alert("Sukses", "Foto profil berhasil diperbarui.");'
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Processed ProfilePhotoEditor.tsx');
}
