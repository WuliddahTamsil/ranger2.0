const mongoose = require('mongoose');
require('dotenv').config();
const HomeHeroBanner = require('../models/HomeHeroBanner');

async function updateBanners() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Update existing videos to sortOrder 2 and 3
  await HomeHeroBanner.updateOne(
    { title: '260126 Proper PGE 2025' },
    { $set: { sortOrder: 2, isActive: true } }
  );

  await HomeHeroBanner.updateOne(
    { title: 'PGE Kamojang Bahasa Final' },
    { $set: { sortOrder: 3, isActive: true } }
  );

  // Check if image banner exists
  let imgBanner = await HomeHeroBanner.findOne({
    $or: [
      { title: 'GEOVERSE - All Your Daily Needs in One App' },
      { mediaUrl: /geoverse-all-needs-hero-slide1/ }
    ]
  });

  const bannerData = {
    title: 'GEOVERSE - All Your Daily Needs in One App',
    subtitle: 'PGE Area Kamojang',
    badgeText: 'GEOVERSE',
    mediaType: 'IMAGE',
    mediaUrl: 'https://res.cloudinary.com/hdlw3v3n/image/upload/v1792335330/geoverse/home-hero/geoverse-all-needs-hero-slide1.jpg',
    thumbnailUrl: 'https://res.cloudinary.com/hdlw3v3n/image/upload/v1792335330/geoverse/home-hero/geoverse-all-needs-hero-slide1.jpg',
    placement: 'CUSTOMER_HOME_HERO',
    isActive: true,
    sortOrder: 1,
    ctaAction: 'NONE',
    ctaLabel: '',
    ctaTarget: '',
    overlayEnabled: false,
    overlayOpacity: 0,
    overlayColor: 'transparent',
    textColor: '#FFFFFF',
    contentAlignment: 'LEFT',
    createdBy: new mongoose.Types.ObjectId('6aa17978d4b39e0b125becd5')
  };

  if (imgBanner) {
    await HomeHeroBanner.updateOne({ _id: imgBanner._id }, { $set: bannerData });
    console.log('Updated existing image banner:', imgBanner._id);
  } else {
    imgBanner = await HomeHeroBanner.create(bannerData);
    console.log('Created new image banner:', imgBanner._id);
  }

  const activeBanners = await HomeHeroBanner.find({ placement: 'CUSTOMER_HOME_HERO', isActive: true }).sort({ sortOrder: 1 });
  console.log('Active banners count:', activeBanners.length);
  for (const b of activeBanners) {
    console.log(b.sortOrder, b.mediaType, b.title, b.mediaUrl);
  }

  process.exit(0);
}

updateBanners().catch(e => { console.error(e); process.exit(1); });
