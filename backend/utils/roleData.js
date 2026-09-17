const getRoleDataValue = (user, key) => {
  const roleData = user?.roleData;
  if (roleData && typeof roleData.get === "function") return roleData.get(key);
  return roleData?.[key];
};

module.exports = { getRoleDataValue };
