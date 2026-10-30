import bcrypt from 'bcryptjs';
import { connectToDatabase, getStudiosCollection, getUsersCollection } from './db.js';
import { Studio, User } from './types.js';

export const SAMPLE_STUDIOS: Omit<Studio, '_id'>[] = [
  {
    title: 'The Daylight Cyclorama Loft',
    category: 'Photo Studio',
    hourlyRate: 95,
    securityDeposit: 150,
    maxCapacity: 18,
    location: 'DUMBO Arts District, Brooklyn, NY',
    image: 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      '18ft Corner Cyclorama Wall',
      'South-Facing 14ft Factory Windows',
      'Profoto B10X Plus 500W Strobes (x4)',
      '1Gbps Symmetrical Dedicated Fiber Wi-Fi',
      'Private Hair & Makeup Vanity Bar',
      'Mobile Sound Dampening Baffle Panels',
      'Freight Elevator Access',
      'Steamer & Commercial Garment Racks',
    ],
    overview: 'Expansive 2,200 sq.ft daylight photo studio featuring an unbroken 18ft curved cyclorama infinity wall. Bathed in consistent southern natural light throughout the day, complete with heavy-duty motorized blackout shades. Optimized for editorial fashion shoots, commercial product imagery, and high-profile portraiture.',
    ownerEmail: 'alex.creator@studiospace.io',
    ownerName: 'Alex Rivers',
    ownerPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    rating: 4.98,
    reviewCount: 38,
    featured: true,
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10'),
  },
  {
    title: 'Prism Sound Stage & Chromakey Bay',
    category: 'Film Stage',
    hourlyRate: 180,
    securityDeposit: 300,
    maxCapacity: 35,
    location: 'Media Arts Center, Burbank, CA',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      'Full Chromakey Green Cyclorama (30x25ft)',
      'Pre-Rigged ARRI Skypanel S60-C Grid',
      'Acoustically Isolated (NC-25 Sound Rating)',
      '600A 3-Phase Camlock Power Service',
      'Silent Dual-Zone HVAC Air Conditioning',
      'Drive-In Rollup Stage Door for Vehicles',
      'Client Video Village & Green Room',
      'DMX Console & Remote Dimming System',
    ],
    overview: 'Purpose-built 3,500 sq.ft soundproof cinema stage engineered for commercial television, feature film VFX, and music video productions. Features a 22ft clear grid height, pre-hung LED lighting network, and ultra-quiet silent air handling.',
    ownerEmail: 'sarah.cinematics@studiospace.io',
    ownerName: 'Sarah Jenkins',
    ownerPhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    rating: 4.94,
    reviewCount: 29,
    featured: true,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  },
  {
    title: 'The Broadcast Suite & Podcast Lounge',
    category: 'Podcast Lounge',
    hourlyRate: 75,
    securityDeposit: 100,
    maxCapacity: 8,
    location: 'Downtown Silicon Hills, Austin, TX',
    image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      'Shure SM7B Vocal Microphones (x4)',
      'Rodecaster Pro II Multi-Track Console',
      'Sony FX3 4K Triple-Camera Setup',
      'Custom Acoustic Oak Slat Wall Paneling',
      'RGB Tube Lighting & Neon Accent Sets',
      'Teleprompter & Live Monitor Return',
      'Ultra-Low Latency Livestream Encoder',
      'Espresso Bar & Sound-Treated Waiting Lounge',
    ],
    overview: 'Turnkey 4-person broadcast podcasting lounge calibrated for high-fidelity audio shows, vodcasts, and interview series. Plug-and-play design allows immediate multi-track SD recording or direct YouTube/Twitch RTMP streaming with isolated mic channels.',
    ownerEmail: 'marcus.pod@studiospace.io',
    ownerName: 'Marcus Vance',
    ownerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    rating: 4.97,
    reviewCount: 52,
    featured: true,
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-20'),
  },
  {
    title: 'Echo Chamber Dolby Atmos Music Suite',
    category: 'Music Suite',
    hourlyRate: 125,
    securityDeposit: 200,
    maxCapacity: 12,
    location: 'Music Row, Nashville, TN',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      '7.1.4 Genelec Dolby Atmos Speaker Array',
      'Solid State Logic (SSL) Origin 32 Console',
      'Neumann U87 Ai & Telefunken ELA M 251 Mics',
      'Double-Walled Floating Vocal Booth',
      'Yamaha C7 Conservatory Grand Piano',
      'Vintage Roland Jupiter-8 & Prophet-5 Synths',
      'Pro Tools Ultimate HDX & Universal Audio DSP',
      'Private Artist Terrace & Refreshment Bar',
    ],
    overview: 'Premier audio tracking and immersive spatial mixing sanctuary certified for Dolby Atmos releases. Features a world-class floating control room with tuned bass traps, pristine vintage microphone lockers, and an acoustically live tracking room.',
    ownerEmail: 'elena.sound@studiospace.io',
    ownerName: 'Elena Rostova',
    ownerPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    rating: 4.99,
    reviewCount: 44,
    featured: true,
    createdAt: new Date('2026-01-22'),
    updatedAt: new Date('2026-01-22'),
  },
  {
    title: 'Artisan Foundry & Ceramic Workshop',
    category: 'Art Workshop',
    hourlyRate: 65,
    securityDeposit: 100,
    maxCapacity: 20,
    location: 'Pioneer Square Arts District, Seattle, WA',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      'Shimpo Whisper Potter Wheels (x8)',
      'Dual Olympic Electric Kilns (Cone 10 Ready)',
      'Heavy Timber Workbenches with Vises',
      'Clay Slab Roller & Glaze Mixing Station',
      'Natural North Skylights for Accurate Color',
      'Industrial Slop Sinks with Clay Traps',
      'Tool Racks: Carving, Sculpting, Printmaking',
      'High-Pressure Clean-Up Hose & Drying Shelves',
    ],
    overview: 'Airy 1,800 sq.ft communal maker studio designed for ceramics, sculpture, printmaking, and fine art workshops. Features polished concrete floors, abundant northern diffused skylight illumination, and professional-grade pottery infrastructure.',
    ownerEmail: 'david.arts@studiospace.io',
    ownerName: 'David Cho',
    ownerPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    rating: 4.91,
    reviewCount: 22,
    featured: true,
    createdAt: new Date('2026-01-25'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    title: 'Neon Horizon Cyberpunk Film Stage',
    category: 'Film Stage',
    hourlyRate: 160,
    securityDeposit: 250,
    maxCapacity: 25,
    location: 'West Midtown Creative Corridor, Atlanta, GA',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      'Custom DMX Programmable Neon Architecture',
      'Hazer & Low-Lying Fog Generation System',
      'Matte Black Sound Absorbing Wall Wrap',
      'Overhead Pipe Grid for Rigging Stunts',
      'Separate Video Monitoring Control Suite',
      '3-Phase Heavy Duty Distribution Box',
      'High-Speed Wi-Fi & Dedicated Upload Pipe',
      'Lockable Equipment Storage Cage',
    ],
    overview: 'Atmospheric creative set built with dynamic neon illumination grids, industrial metallic textures, and haze dispersion conduits. Perfect for futuristic sci-fi scenes, high-energy music videos, and edgy apparel campaigns.',
    ownerEmail: 'alex.creator@studiospace.io',
    ownerName: 'Alex Rivers',
    ownerPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    rating: 4.96,
    reviewCount: 31,
    featured: true,
    createdAt: new Date('2026-01-28'),
    updatedAt: new Date('2026-01-28'),
  },
  {
    title: 'SoHo Natural Light Editorial Atelier',
    category: 'Photo Studio',
    hourlyRate: 110,
    securityDeposit: 150,
    maxCapacity: 15,
    location: 'SoHo Historic District, New York, NY',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      'Arched Factory Window Walls (East & South)',
      'Restored Herringbone Oak Hardwood Flooring',
      'Curated Mid-Century Modern Furniture Props',
      'Broncolor Senso 1200 J Lighting Packs',
      'Private Hair & Makeup Dressing Suite',
      'Espresso & Sparkling Water Bar',
      'High Speed Wireless Tethering Station',
      'Custom Backdrop Paper Rolls in 12 Tones',
    ],
    overview: 'Iconic 1,900 sq.ft loft in the heart of SoHo featuring cast-iron Corinthian pillars, bleached oak floors, and massive arched windows. Favored by Vogue, GQ, and luxury brands for effortless daylight portraiture and lookbook shoots.',
    ownerEmail: 'chloe.atelier@studiospace.io',
    ownerName: 'Chloe Laurent',
    ownerPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    rating: 4.99,
    reviewCount: 47,
    featured: true,
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-01'),
  },
  {
    title: 'Velvet Groove Analog Vinyl & Beat Lab',
    category: 'Music Suite',
    hourlyRate: 85,
    securityDeposit: 120,
    maxCapacity: 10,
    location: 'Wicker Park Creative Hub, Chicago, IL',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      'Akai MPC 3000 & E-mu SP-1200 Drum Samplers',
      'Technics SL-1200MK7 Turntables with Ortofon Cartridges',
      'Focal Trio6 Be Studio Reference Monitors',
      'Extensive 5,000+ Rare Vinyl Sample Crate Library',
      'Warm Audio WA-273 British Preamp (x2)',
      'Custom Walnut Modular Producer Desk',
      'Subwoofer Acoustically Calibrated at 28Hz',
      'Comfortable Suede Sectional Producer Couch',
    ],
    overview: 'Intimate, warm analog production sanctuary equipped with legendary vintage drum machines, rare vinyl sample vaults, and pristine studio monitors. Crafted specifically for beatmakers, hip-hop producers, and electronic musicians.',
    ownerEmail: 'darius.beats@studiospace.io',
    ownerName: 'Darius Cole',
    ownerPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    rating: 4.95,
    reviewCount: 26,
    featured: true,
    createdAt: new Date('2026-02-05'),
    updatedAt: new Date('2026-02-05'),
  },
];

export async function seedDatabase() {
  const db = await connectToDatabase();
  const studiosCol = getStudiosCollection();
  const usersCol = getUsersCollection();

  // Seed Default Test User for Examiner
  const testEmail = 'alex.creator@studiospace.io';
  const existingUser = await usersCol.findOne({ email: testEmail });
  if (!existingUser) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Studio@2026', salt);

    const testUser: User = {
      name: 'Alex Rivers',
      email: testEmail,
      password: hashedPassword,
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      role: 'host',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await usersCol.insertOne(testUser);
    console.log('[Seed] Created default examiner account: alex.creator@studiospace.io / Studio@2026');
  }

  // Seed Studios if empty or count < 6
  const studioCount = await studiosCol.countDocuments();
  if (studioCount < 6) {
    console.log(`[Seed] Current studio count is ${studioCount}. Seeding default studios...`);
    await studiosCol.deleteMany({});
    await studiosCol.insertMany(SAMPLE_STUDIOS as any);
    console.log(`[Seed] Successfully seeded ${SAMPLE_STUDIOS.length} world-class creative studios!`);
  } else {
    console.log(`[Seed] Database already has ${studioCount} studios. Seed skipped.`);
  }
}

// Allow standalone execution
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
