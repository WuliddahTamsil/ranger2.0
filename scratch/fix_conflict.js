const fs = require('fs');
const p = 'C:/Users/ASUS/Downloads/Design The Rangers App 2.0/the_ranger_react_native/src/types/index.ts';
let c = fs.readFileSync(p, 'utf8');
const replacement = `  | "auth_register_role" | "auth_register" | "auth_register_success" | "auth_forgot_password"
  | "c_home" | "c_marketplace" | "c_catering" | "c_laundry" | "c_laundry_detail" | "c_laundry_tracking" | "c_kos" | "c_kos_detail" | "c_product_detail"
  | "c_checkout" | "c_order_success" | "c_tracking"
  | "c_catering_detail" | "c_catering_payment" | "c_catering_qris"`;

c = c.replace(/<<<<<<< Updated upstream[\s\S]*?>>>>>>> Stashed changes/, replacement);
fs.writeFileSync(p, c, 'utf8');
console.log('Conflict resolved successfully!');
