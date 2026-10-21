const fs = require('fs');
let c = fs.readFileSync('src/screens/pemilik_shop/Beranda.tsx', 'utf8');
c = c.replace(/\r\n/g, '\n');
c = c.replace(
  /Alert\.alert\(\s+"Hapus Produk\?",[\s\S]*?\);\s+\}\s+\};/,
  `Alert.alert(
      "Hapus Produk?",
      \`Yakin ingin menghapus \${product.name} secara permanen dari katalog etalase?\`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Hapus Permanen", style: "destructive", onPress: () => void doDelete() },
      ]
    );
  };`
);
fs.writeFileSync('src/screens/pemilik_shop/Beranda.tsx', c, 'utf8');
console.log('Successfully fixed shop/Beranda.tsx');
