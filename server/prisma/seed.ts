import { PrismaClient, ProjectType, Median, DemandType, DemandStatus, Priority, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCloudMonitor() {
  const count = await prisma.cloudResourceStatus.count();
  if (count > 0) {
    console.log('CloudResourceStatus already seeded, skipping.');
    return;
  }

  // Upsert Hebrew reference records required by FK constraints
  const bases = ['תל אביב', 'אשדוד', 'חיפה', 'ירושלים'];
  const networks = ['הוגו', 'מרקו', 'מנגו'];
  const clusters = ['cluster-1', 'cluster-2'];

  await Promise.all(bases.map(name =>
    prisma.base.upsert({ where: { name }, update: {}, create: { name, displayName: name, isActive: true } })
  ));
  await Promise.all(networks.map(name =>
    prisma.network.upsert({ where: { name }, update: {}, create: { name, displayName: name, isActive: true } })
  ));
  await Promise.all(clusters.map(name =>
    prisma.cluster.upsert({ where: { name }, update: {}, create: { name, displayName: name, isActive: true } })
  ));

  await prisma.cloudResourceStatus.createMany({
    skipDuplicates: true,
    data: [
      // ── תל אביב / הוגו / cluster-1 ──
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-1', service: 'ECK',    status: 'green',  reason: 'תקין, קיבולת מלאה',              tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-1', service: 'VM',     status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-1', service: 'OCP',    status: 'yellow', reason: '80% קיבולת — צוואר בקבוק',       tag: 'CAPACITY' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Mongo',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-1', service: 'NiFi',   status: 'yellow', reason: 'ממתין לאישור לקוח',               tag: 'CLIENT_PROCESS' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Redis',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Kafka',  status: 'red',    reason: 'תחזוקה מתוכננת 23:00',           tag: 'MAINTENANCE' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Harbor', status: 'green',  reason: 'תקין',                            tag: 'OK' },
      // ── תל אביב / הוגו / cluster-2 ──
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-2', service: 'ECK',    status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-2', service: 'VM',     status: 'yellow', reason: 'disk 70%',                        tag: 'CAPACITY' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-2', service: 'OCP',    status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-2', service: 'Mongo',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-2', service: 'NiFi',   status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-2', service: 'Redis',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-2', service: 'Kafka',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'הוגו', clusterName: 'cluster-2', service: 'Harbor', status: 'green',  reason: 'תקין',                            tag: 'OK' },
      // ── תל אביב / מרקו / cluster-1 ──
      { baseName: 'תל אביב', networkName: 'מרקו', clusterName: 'cluster-1', service: 'ECK',    status: 'yellow', reason: 'עומס גבוה על index',              tag: 'CAPACITY' },
      { baseName: 'תל אביב', networkName: 'מרקו', clusterName: 'cluster-1', service: 'VM',     status: 'red',    reason: 'ממתין לתהליך לקוח (VLAN)',        tag: 'CLIENT_PROCESS' },
      { baseName: 'תל אביב', networkName: 'מרקו', clusterName: 'cluster-1', service: 'OCP',    status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'מרקו', clusterName: 'cluster-1', service: 'Mongo',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'מרקו', clusterName: 'cluster-1', service: 'NiFi',   status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'מרקו', clusterName: 'cluster-1', service: 'Redis',  status: 'red',    reason: 'Cluster בתהליך שדרוג',            tag: 'MAINTENANCE' },
      { baseName: 'תל אביב', networkName: 'מרקו', clusterName: 'cluster-1', service: 'Kafka',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'מרקו', clusterName: 'cluster-1', service: 'Harbor', status: 'yellow', reason: 'נפח storage בגבול',              tag: 'CAPACITY' },
      // ── תל אביב / מנגו / cluster-1 ──
      { baseName: 'תל אביב', networkName: 'מנגו', clusterName: 'cluster-1', service: 'ECK',    status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'מנגו', clusterName: 'cluster-1', service: 'VM',     status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'מנגו', clusterName: 'cluster-1', service: 'OCP',    status: 'red',    reason: 'cert פג — ממתין לחידוש',         tag: 'MAINTENANCE' },
      { baseName: 'תל אביב', networkName: 'מנגו', clusterName: 'cluster-1', service: 'Mongo',  status: 'yellow', reason: 'replication lag גבוה',            tag: 'CAPACITY' },
      { baseName: 'תל אביב', networkName: 'מנגו', clusterName: 'cluster-1', service: 'NiFi',   status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'מנגו', clusterName: 'cluster-1', service: 'Redis',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'מנגו', clusterName: 'cluster-1', service: 'Kafka',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'תל אביב', networkName: 'מנגו', clusterName: 'cluster-1', service: 'Harbor', status: 'green',  reason: 'תקין',                            tag: 'OK' },
      // ── אשדוד / הוגו / cluster-1 ──
      { baseName: 'אשדוד', networkName: 'הוגו', clusterName: 'cluster-1', service: 'ECK',    status: 'green',  reason: 'תקין',                              tag: 'OK' },
      { baseName: 'אשדוד', networkName: 'הוגו', clusterName: 'cluster-1', service: 'VM',     status: 'red',    reason: 'לא זמין — ממתין לאינטגרציה',       tag: 'CLIENT_PROCESS' },
      { baseName: 'אשדוד', networkName: 'הוגו', clusterName: 'cluster-1', service: 'OCP',    status: 'green',  reason: 'תקין',                              tag: 'OK' },
      { baseName: 'אשדוד', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Mongo',  status: 'yellow', reason: 'replica node ירד',                  tag: 'CAPACITY' },
      { baseName: 'אשדוד', networkName: 'הוגו', clusterName: 'cluster-1', service: 'NiFi',   status: 'green',  reason: 'תקין',                              tag: 'OK' },
      { baseName: 'אשדוד', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Redis',  status: 'green',  reason: 'תקין',                              tag: 'OK' },
      { baseName: 'אשדוד', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Kafka',  status: 'yellow', reason: 'consumer lag גבוה',                 tag: 'CAPACITY' },
      { baseName: 'אשדוד', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Harbor', status: 'green',  reason: 'תקין',                              tag: 'OK' },
      // ── אשדוד / מרקו / cluster-1 ──
      { baseName: 'אשדוד', networkName: 'מרקו', clusterName: 'cluster-1', service: 'ECK',    status: 'green',  reason: 'תקין',                              tag: 'OK' },
      { baseName: 'אשדוד', networkName: 'מרקו', clusterName: 'cluster-1', service: 'VM',     status: 'green',  reason: 'תקין',                              tag: 'OK' },
      { baseName: 'אשדוד', networkName: 'מרקו', clusterName: 'cluster-1', service: 'OCP',    status: 'yellow', reason: 'pending PV claims',                 tag: 'CAPACITY' },
      { baseName: 'אשדוד', networkName: 'מרקו', clusterName: 'cluster-1', service: 'Mongo',  status: 'green',  reason: 'תקין',                              tag: 'OK' },
      { baseName: 'אשדוד', networkName: 'מרקו', clusterName: 'cluster-1', service: 'NiFi',   status: 'red',    reason: 'תחזוקה עד 06:00',                  tag: 'MAINTENANCE' },
      { baseName: 'אשדוד', networkName: 'מרקו', clusterName: 'cluster-1', service: 'Redis',  status: 'green',  reason: 'תקין',                              tag: 'OK' },
      { baseName: 'אשדוד', networkName: 'מרקו', clusterName: 'cluster-1', service: 'Kafka',  status: 'green',  reason: 'תקין',                              tag: 'OK' },
      { baseName: 'אשדוד', networkName: 'מרקו', clusterName: 'cluster-1', service: 'Harbor', status: 'green',  reason: 'תקין',                              tag: 'OK' },
      // ── חיפה / מנגו / cluster-1 ──
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-1', service: 'ECK',    status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-1', service: 'VM',     status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-1', service: 'OCP',    status: 'red',    reason: 'cluster upgrade בתהליך',             tag: 'MAINTENANCE' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-1', service: 'Mongo',  status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-1', service: 'NiFi',   status: 'yellow', reason: 'flow designer חסום',                 tag: 'CLIENT_PROCESS' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-1', service: 'Redis',  status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-1', service: 'Kafka',  status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-1', service: 'Harbor', status: 'green',  reason: 'תקין',                               tag: 'OK' },
      // ── חיפה / מנגו / cluster-2 ──
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-2', service: 'ECK',    status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-2', service: 'VM',     status: 'yellow', reason: 'קיבולת disk 75%',                    tag: 'CAPACITY' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-2', service: 'OCP',    status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-2', service: 'Mongo',  status: 'red',    reason: 'failover בתהליך',                    tag: 'MAINTENANCE' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-2', service: 'NiFi',   status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-2', service: 'Redis',  status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-2', service: 'Kafka',  status: 'green',  reason: 'תקין',                               tag: 'OK' },
      { baseName: 'חיפה', networkName: 'מנגו', clusterName: 'cluster-2', service: 'Harbor', status: 'green',  reason: 'תקין',                               tag: 'OK' },
      // ── ירושלים / הוגו / cluster-1 ──
      { baseName: 'ירושלים', networkName: 'הוגו', clusterName: 'cluster-1', service: 'ECK',    status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'ירושלים', networkName: 'הוגו', clusterName: 'cluster-1', service: 'VM',     status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'ירושלים', networkName: 'הוגו', clusterName: 'cluster-1', service: 'OCP',    status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'ירושלים', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Mongo',  status: 'yellow', reason: 'ממתין ל-DR test',                 tag: 'CLIENT_PROCESS' },
      { baseName: 'ירושלים', networkName: 'הוגו', clusterName: 'cluster-1', service: 'NiFi',   status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'ירושלים', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Redis',  status: 'green',  reason: 'תקין',                            tag: 'OK' },
      { baseName: 'ירושלים', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Kafka',  status: 'yellow', reason: 'partition rebalance',             tag: 'CAPACITY' },
      { baseName: 'ירושלים', networkName: 'הוגו', clusterName: 'cluster-1', service: 'Harbor', status: 'green',  reason: 'תקין',                            tag: 'OK' },
    ],
  });

  console.log('CloudResourceStatus seeded: 72 entries');
}

async function main() {
  console.log('Seeding database...');

  // ============================================
  // Organization Models
  // ============================================

  const centers = await Promise.all([
    prisma.center.upsert({
      where: { name: 'IT Center' },
      update: {},
      create: { name: 'IT Center', displayName: 'Information Technology Center', isActive: true },
    }),
    prisma.center.upsert({
      where: { name: 'Operations Center' },
      update: {},
      create: { name: 'Operations Center', displayName: 'Global Operations Center', isActive: true },
    }),
    prisma.center.upsert({
      where: { name: 'Finance Center' },
      update: {},
      create: { name: 'Finance Center', displayName: 'Central Finance', isActive: true },
    }),
    prisma.center.upsert({
      where: { name: 'HR Center' },
      update: {},
      create: { name: 'HR Center', displayName: 'Human Resources', isActive: true },
    }),
    prisma.center.upsert({
      where: { name: 'Research Center' },
      update: {},
      create: { name: 'Research Center', displayName: 'R&D Center', isActive: true },
    }),
  ]);
  console.log(`Created ${centers.length} centers`);

  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { name_centerName: { name: 'Development', centerName: 'IT Center' } },
      update: {},
      create: { name: 'Development', centerName: 'IT Center', displayName: 'Software Development', isActive: true },
    }),
    prisma.branch.upsert({
      where: { name_centerName: { name: 'Infrastructure', centerName: 'IT Center' } },
      update: {},
      create: { name: 'Infrastructure', centerName: 'IT Center', displayName: 'IT Infrastructure', isActive: true },
    }),
    prisma.branch.upsert({
      where: { name_centerName: { name: 'Logistics', centerName: 'Operations Center' } },
      update: {},
      create: { name: 'Logistics', centerName: 'Operations Center', displayName: 'Supply Chain & Logistics', isActive: true },
    }),
    prisma.branch.upsert({
      where: { name_centerName: { name: 'Accounting', centerName: 'Finance Center' } },
      update: {},
      create: { name: 'Accounting', centerName: 'Finance Center', displayName: 'Corporate Accounting', isActive: true },
    }),
    prisma.branch.upsert({
      where: { name_centerName: { name: 'Recruitment', centerName: 'HR Center' } },
      update: {},
      create: { name: 'Recruitment', centerName: 'HR Center', displayName: 'Talent Acquisition', isActive: true },
    }),
  ]);
  console.log(`Created ${branches.length} branches`);

  const sections = await Promise.all([
    prisma.section.upsert({
      where: { name_branchName_branchCenter: { name: 'Backend Team', branchName: 'Development', branchCenter: 'IT Center' } },
      update: {},
      create: { name: 'Backend Team', branchName: 'Development', branchCenter: 'IT Center', displayName: 'Backend Engineering', isActive: true },
    }),
    prisma.section.upsert({
      where: { name_branchName_branchCenter: { name: 'Frontend Team', branchName: 'Development', branchCenter: 'IT Center' } },
      update: {},
      create: { name: 'Frontend Team', branchName: 'Development', branchCenter: 'IT Center', displayName: 'Frontend Engineering', isActive: true },
    }),
    prisma.section.upsert({
      where: { name_branchName_branchCenter: { name: 'Cloud Team', branchName: 'Infrastructure', branchCenter: 'IT Center' } },
      update: {},
      create: { name: 'Cloud Team', branchName: 'Infrastructure', branchCenter: 'IT Center', displayName: 'Cloud Operations', isActive: true },
    }),
    prisma.section.upsert({
      where: { name_branchName_branchCenter: { name: 'Warehouse', branchName: 'Logistics', branchCenter: 'Operations Center' } },
      update: {},
      create: { name: 'Warehouse', branchName: 'Logistics', branchCenter: 'Operations Center', displayName: 'Main Warehouse', isActive: true },
    }),
    prisma.section.upsert({
      where: { name_branchName_branchCenter: { name: 'Payroll', branchName: 'Accounting', branchCenter: 'Finance Center' } },
      update: {},
      create: { name: 'Payroll', branchName: 'Accounting', branchCenter: 'Finance Center', displayName: 'Payroll Department', isActive: true },
    }),
  ]);
  console.log(`Created ${sections.length} sections`);

  // ============================================
  // Location Models
  // ============================================

  const bases = await Promise.all([
    prisma.base.upsert({ where: { name: 'Datacenter A' }, update: {}, create: { name: 'Datacenter A', displayName: 'Primary DC', isActive: true } }),
    prisma.base.upsert({ where: { name: 'Datacenter B' }, update: {}, create: { name: 'Datacenter B', displayName: 'Secondary DC', isActive: true } }),
    prisma.base.upsert({ where: { name: 'Cloud AWS' }, update: {}, create: { name: 'Cloud AWS', displayName: 'AWS Cloud Region', isActive: true } }),
    prisma.base.upsert({ where: { name: 'Cloud Azure' }, update: {}, create: { name: 'Cloud Azure', displayName: 'Azure Cloud Region', isActive: true } }),
    prisma.base.upsert({ where: { name: 'Edge Site' }, update: {}, create: { name: 'Edge Site', displayName: 'Remote Edge Location', isActive: true } }),
  ]);
  console.log(`Created ${bases.length} bases`);

  const environments = await Promise.all([
    prisma.environment.upsert({ where: { name: 'Production' }, update: {}, create: { name: 'Production', displayName: 'Prod Env', isActive: true } }),
    prisma.environment.upsert({ where: { name: 'Staging' }, update: {}, create: { name: 'Staging', displayName: 'Staging Env', isActive: true } }),
    prisma.environment.upsert({ where: { name: 'Development' }, update: {}, create: { name: 'Development', displayName: 'Dev Env', isActive: true } }),
    prisma.environment.upsert({ where: { name: 'QA' }, update: {}, create: { name: 'QA', displayName: 'QA Env', isActive: true } }),
    prisma.environment.upsert({ where: { name: 'DR' }, update: {}, create: { name: 'DR', displayName: 'Disaster Recovery', isActive: true } }),
  ]);
  console.log(`Created ${environments.length} environments`);

  const networks = await Promise.all([
    prisma.network.upsert({ where: { name: 'Internal' }, update: {}, create: { name: 'Internal', displayName: 'Internal Network', isActive: true } }),
    prisma.network.upsert({ where: { name: 'DMZ' }, update: {}, create: { name: 'DMZ', displayName: 'De-Militarized Zone', isActive: true } }),
    prisma.network.upsert({ where: { name: 'Public' }, update: {}, create: { name: 'Public', displayName: 'Public Internet', isActive: true } }),
    prisma.network.upsert({ where: { name: 'Private VPC' }, update: {}, create: { name: 'Private VPC', displayName: 'Private VPC Network', isActive: true } }),
    prisma.network.upsert({ where: { name: 'Isolated' }, update: {}, create: { name: 'Isolated', displayName: 'Air-Gapped Network', isActive: true } }),
  ]);
  console.log(`Created ${networks.length} networks`);

  const clusters = await Promise.all([
    prisma.cluster.upsert({ where: { name: 'Cluster-A' }, update: {}, create: { name: 'Cluster-A', displayName: 'Primary Cluster', isActive: true } }),
    prisma.cluster.upsert({ where: { name: 'Cluster-B' }, update: {}, create: { name: 'Cluster-B', displayName: 'Secondary Cluster', isActive: true } }),
    prisma.cluster.upsert({ where: { name: 'Cluster-C' }, update: {}, create: { name: 'Cluster-C', displayName: 'Development Cluster', isActive: true } }),
    prisma.cluster.upsert({ where: { name: 'Cluster-D' }, update: {}, create: { name: 'Cluster-D', displayName: 'DR Cluster', isActive: true } }),
    prisma.cluster.upsert({ where: { name: 'Cluster-E' }, update: {}, create: { name: 'Cluster-E', displayName: 'Edge Cluster', isActive: true } }),
  ]);
  console.log(`Created ${clusters.length} clusters`);

  const locations = await Promise.all([
    prisma.location.upsert({
      where: { baseName_environmentName_networkName_clusterName: { baseName: 'Datacenter A', environmentName: 'Production', networkName: 'Internal', clusterName: 'Cluster-A' } },
      update: {},
      create: { baseName: 'Datacenter A', environmentName: 'Production', networkName: 'Internal', clusterName: 'Cluster-A', isActive: true },
    }),
    prisma.location.upsert({
      where: { baseName_environmentName_networkName_clusterName: { baseName: 'Datacenter A', environmentName: 'Staging', networkName: 'Internal', clusterName: 'Cluster-B' } },
      update: {},
      create: { baseName: 'Datacenter A', environmentName: 'Staging', networkName: 'Internal', clusterName: 'Cluster-B', isActive: true },
    }),
    prisma.location.upsert({
      where: { baseName_environmentName_networkName_clusterName: { baseName: 'Cloud AWS', environmentName: 'Production', networkName: 'Private VPC', clusterName: 'Cluster-A' } },
      update: {},
      create: { baseName: 'Cloud AWS', environmentName: 'Production', networkName: 'Private VPC', clusterName: 'Cluster-A', isActive: true },
    }),
    prisma.location.upsert({
      where: { baseName_environmentName_networkName_clusterName: { baseName: 'Cloud AWS', environmentName: 'Development', networkName: 'Private VPC', clusterName: 'Cluster-C' } },
      update: {},
      create: { baseName: 'Cloud AWS', environmentName: 'Development', networkName: 'Private VPC', clusterName: 'Cluster-C', isActive: true },
    }),
    prisma.location.upsert({
      where: { baseName_environmentName_networkName_clusterName: { baseName: 'Datacenter B', environmentName: 'DR', networkName: 'Isolated', clusterName: 'Cluster-D' } },
      update: {},
      create: { baseName: 'Datacenter B', environmentName: 'DR', networkName: 'Isolated', clusterName: 'Cluster-D', isActive: true },
    }),
  ]);
  console.log(`Created ${locations.length} locations`);

  // ============================================
  // Service Models
  // ============================================

  // Service moderator assignments - each service has at least 1 responsible moderator
  // Moderators: mod1-mod7 (defined in Keycloak realm)

  // Clean up stale services from old taxonomy
  await prisma.service.deleteMany({
    where: { name: { in: ['Compute', 'Storage', 'Network', 'Database', 'Container'] } },
  });
  console.log('Removed stale services');

  const services = await Promise.all([
    // Storage
    prisma.service.upsert({ where: { name: 'HDFS' }, update: { moderators: ['mod3'], displayName: 'HDFS' }, create: { name: 'HDFS', displayName: 'Hadoop Distributed File System', moderators: ['mod3'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'NAS' }, update: { moderators: ['mod3'], displayName: 'NAS' }, create: { name: 'NAS', displayName: 'Network Attached Storage', moderators: ['mod3'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'S3' }, update: { moderators: ['mod3'], displayName: 'S3' }, create: { name: 'S3', displayName: 'S3 Object Storage', moderators: ['mod3'], isActive: true } }),
    // Databases
    prisma.service.upsert({ where: { name: 'MongoK' }, update: { moderators: ['mod4'], displayName: 'MongoK' }, create: { name: 'MongoK', displayName: 'MongoDB on Kubernetes', moderators: ['mod4'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'MongoVM' }, update: { moderators: ['mod4'], displayName: 'MongoVM' }, create: { name: 'MongoVM', displayName: 'MongoDB on VM', moderators: ['mod4'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'Postgres (PG)' }, update: { moderators: ['mod4'], displayName: 'Postgres (PG)' }, create: { name: 'Postgres (PG)', displayName: 'PostgreSQL', moderators: ['mod4'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'ECK' }, update: { moderators: ['mod6'], displayName: 'ECK' }, create: { name: 'ECK', displayName: 'Elastic Cloud on Kubernetes', moderators: ['mod6'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'Redis' }, update: { moderators: ['mod6'], displayName: 'Redis' }, create: { name: 'Redis', displayName: 'Redis In-Memory Store', moderators: ['mod6'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'Oracle' }, update: { moderators: ['mod5'], displayName: 'Oracle' }, create: { name: 'Oracle', displayName: 'Oracle Database', moderators: ['mod5'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'MSSQL' }, update: { moderators: ['mod5'], displayName: 'MSSQL' }, create: { name: 'MSSQL', displayName: 'Microsoft SQL Server', moderators: ['mod5'], isActive: true } }),
    // Processing
    prisma.service.upsert({ where: { name: 'Openshift' }, update: { moderators: ['mod1'], displayName: 'Openshift' }, create: { name: 'Openshift', displayName: 'Red Hat OpenShift', moderators: ['mod1'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'Spark' }, update: { moderators: ['mod6', 'mod7'], displayName: 'Spark' }, create: { name: 'Spark', displayName: 'Apache Spark', moderators: ['mod6', 'mod7'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'VM' }, update: { moderators: ['mod1'], displayName: 'VM' }, create: { name: 'VM', displayName: 'Virtual Machine', moderators: ['mod1'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'RUNAI' }, update: { moderators: ['mod1', 'mod7'], displayName: 'RUNAI' }, create: { name: 'RUNAI', displayName: 'Run:AI GPU Orchestration', moderators: ['mod1', 'mod7'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'LLM' }, update: { moderators: ['mod1', 'mod7'], displayName: 'LLM' }, create: { name: 'LLM', displayName: 'Large Language Model', moderators: ['mod1', 'mod7'], isActive: true } }),
    // Data Transport
    prisma.service.upsert({ where: { name: 'NIFI' }, update: { moderators: ['mod2'], displayName: 'NIFI' }, create: { name: 'NIFI', displayName: 'Apache NiFi', moderators: ['mod2'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'CAAS' }, update: { moderators: ['mod2'], displayName: 'CAAS' }, create: { name: 'CAAS', displayName: 'Connectivity as a Service', moderators: ['mod2'], isActive: true } }),
    prisma.service.upsert({ where: { name: 'KAFKA' }, update: { moderators: ['mod2', 'mod7'], displayName: 'KAFKA' }, create: { name: 'KAFKA', displayName: 'Apache Kafka', moderators: ['mod2', 'mod7'], isActive: true } }),
  ]);
  console.log(`Created ${services.length} services`);

  const resources = await Promise.all([
    // HDFS
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Files Amount', serviceName: 'HDFS' } }, update: {}, create: { name: 'Files Amount', unit: 'count', serviceName: 'HDFS', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Space Quota', serviceName: 'HDFS' } }, update: {}, create: { name: 'Space Quota', unit: 'GB', serviceName: 'HDFS', isActive: true } }),
    // NAS
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage', serviceName: 'NAS' } }, update: {}, create: { name: 'Storage', unit: 'GB', serviceName: 'NAS', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Hardware Type', serviceName: 'NAS' } }, update: {}, create: { name: 'Hardware Type', unit: 'HDD/SSD', serviceName: 'NAS', isActive: true } }),
    // S3
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage', serviceName: 'S3' } }, update: {}, create: { name: 'Storage', unit: 'GB', serviceName: 'S3', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Files Amount', serviceName: 'S3' } }, update: {}, create: { name: 'Files Amount', unit: 'count', serviceName: 'S3', isActive: true } }),
    // MongoK, MongoVM, Postgres (PG), Oracle, MSSQL
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage', serviceName: 'MongoK' } }, update: {}, create: { name: 'Storage', unit: 'GB', serviceName: 'MongoK', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage', serviceName: 'MongoVM' } }, update: {}, create: { name: 'Storage', unit: 'GB', serviceName: 'MongoVM', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage', serviceName: 'Postgres (PG)' } }, update: {}, create: { name: 'Storage', unit: 'GB', serviceName: 'Postgres (PG)', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage', serviceName: 'Oracle' } }, update: {}, create: { name: 'Storage', unit: 'GB', serviceName: 'Oracle', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage', serviceName: 'MSSQL' } }, update: {}, create: { name: 'Storage', unit: 'GB', serviceName: 'MSSQL', isActive: true } }),
    // ECK
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Elastic Type', serviceName: 'ECK' } }, update: {}, create: { name: 'Elastic Type', unit: 'Logs/Text/geo/Vector', serviceName: 'ECK', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'License', serviceName: 'ECK' } }, update: {}, create: { name: 'License', unit: 'count', serviceName: 'ECK', isActive: true } }),
    // Redis
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Memory (Shards X7)', serviceName: 'Redis' } }, update: {}, create: { name: 'Memory (Shards X7)', unit: 'GB', serviceName: 'Redis', isActive: true } }),
    // Openshift
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Memory', serviceName: 'Openshift' } }, update: {}, create: { name: 'Memory', unit: 'GB', serviceName: 'Openshift', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Pods', serviceName: 'Openshift' } }, update: {}, create: { name: 'Pods', unit: 'count', serviceName: 'Openshift', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Cores', serviceName: 'Openshift' } }, update: {}, create: { name: 'Cores', unit: 'count', serviceName: 'Openshift', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'CPU', serviceName: 'Openshift' } }, update: {}, create: { name: 'CPU', unit: 'count', serviceName: 'Openshift', isActive: true } }),
    // Spark
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Memory', serviceName: 'Spark' } }, update: {}, create: { name: 'Memory', unit: 'GB', serviceName: 'Spark', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage', serviceName: 'Spark' } }, update: {}, create: { name: 'Storage', unit: 'GB', serviceName: 'Spark', isActive: true } }),
    // VM
    prisma.resource.upsert({ where: { name_serviceName: { name: 'vCPU', serviceName: 'VM' } }, update: {}, create: { name: 'vCPU', unit: 'count', serviceName: 'VM', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'CPU', serviceName: 'VM' } }, update: {}, create: { name: 'CPU', unit: 'GHz', serviceName: 'VM', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Memory', serviceName: 'VM' } }, update: {}, create: { name: 'Memory', unit: 'GB', serviceName: 'VM', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'GPU type', serviceName: 'VM' } }, update: {}, create: { name: 'GPU type', unit: 'A100/T4/H100', serviceName: 'VM', isActive: true } }),
    // RUNAI
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage', serviceName: 'RUNAI' } }, update: {}, create: { name: 'Storage', unit: 'GB', serviceName: 'RUNAI', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Memory', serviceName: 'RUNAI' } }, update: {}, create: { name: 'Memory', unit: 'GB', serviceName: 'RUNAI', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'GPU', serviceName: 'RUNAI' } }, update: {}, create: { name: 'GPU', unit: 'count', serviceName: 'RUNAI', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'CPU', serviceName: 'RUNAI' } }, update: {}, create: { name: 'CPU', unit: 'count', serviceName: 'RUNAI', isActive: true } }),
    // LLM
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Model Size', serviceName: 'LLM' } }, update: {}, create: { name: 'Model Size', unit: 'count', serviceName: 'LLM', isActive: true } }),
    // NIFI
    prisma.resource.upsert({ where: { name_serviceName: { name: 'CPU', serviceName: 'NIFI' } }, update: {}, create: { name: 'CPU', unit: 'count', serviceName: 'NIFI', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Memory', serviceName: 'NIFI' } }, update: {}, create: { name: 'Memory', unit: 'GB', serviceName: 'NIFI', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Messages per Second', serviceName: 'NIFI' } }, update: {}, create: { name: 'Messages per Second', unit: 'count', serviceName: 'NIFI', isActive: true } }),
    // CAAS
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Throughput', serviceName: 'CAAS' } }, update: {}, create: { name: 'Throughput', unit: 'MB/s', serviceName: 'CAAS', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'files type', serviceName: 'CAAS' } }, update: {}, create: { name: 'files type', unit: 'Schematic/Binary', serviceName: 'CAAS', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'files Size', serviceName: 'CAAS' } }, update: {}, create: { name: 'files Size', unit: 'small/big', serviceName: 'CAAS', isActive: true } }),
    // KAFKA
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Storage (no backup)', serviceName: 'KAFKA' } }, update: {}, create: { name: 'Storage (no backup)', unit: 'GB', serviceName: 'KAFKA', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Throughput in', serviceName: 'KAFKA' } }, update: {}, create: { name: 'Throughput in', unit: 'MB/s', serviceName: 'KAFKA', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Throughput out', serviceName: 'KAFKA' } }, update: {}, create: { name: 'Throughput out', unit: 'MB/s', serviceName: 'KAFKA', isActive: true } }),
    prisma.resource.upsert({ where: { name_serviceName: { name: 'Partitions', serviceName: 'KAFKA' } }, update: {}, create: { name: 'Partitions', unit: 'count', serviceName: 'KAFKA', isActive: true } }),
  ]);
  console.log(`Created ${resources.length} resources`);

  const capacities = await Promise.all([
    prisma.capacity.upsert({
      where: { locationId_resourceName_resourceService: { locationId: locations[0].id, resourceName: 'vCPU', resourceService: 'VM' } },
      update: {},
      create: { locationId: locations[0].id, resourceName: 'vCPU', resourceService: 'VM', value: 1000 },
    }),
    prisma.capacity.upsert({
      where: { locationId_resourceName_resourceService: { locationId: locations[0].id, resourceName: 'Memory', resourceService: 'VM' } },
      update: {},
      create: { locationId: locations[0].id, resourceName: 'Memory', resourceService: 'VM', value: 4096 },
    }),
    prisma.capacity.upsert({
      where: { locationId_resourceName_resourceService: { locationId: locations[0].id, resourceName: 'Space Quota', resourceService: 'HDFS' } },
      update: {},
      create: { locationId: locations[0].id, resourceName: 'Space Quota', resourceService: 'HDFS', value: 100000 },
    }),
    prisma.capacity.upsert({
      where: { locationId_resourceName_resourceService: { locationId: locations[2].id, resourceName: 'vCPU', resourceService: 'VM' } },
      update: {},
      create: { locationId: locations[2].id, resourceName: 'vCPU', resourceService: 'VM', value: 500 },
    }),
    prisma.capacity.upsert({
      where: { locationId_resourceName_resourceService: { locationId: locations[4].id, resourceName: 'Memory', resourceService: 'VM' } },
      update: {},
      create: { locationId: locations[4].id, resourceName: 'Memory', resourceService: 'VM', value: 2048 },
    }),
  ]);
  console.log(`Created ${capacities.length} capacities`);

  // ============================================
  // Wallet Models
  // ============================================

  const wallets = await Promise.all([
    prisma.wallet.upsert({
      where: { centerName_capacityId: { centerName: 'IT Center', capacityId: capacities[0].id } },
      update: {},
      create: { centerName: 'IT Center', capacityId: capacities[0].id, value: 500 },
    }),
    prisma.wallet.upsert({
      where: { centerName_capacityId: { centerName: 'IT Center', capacityId: capacities[1].id } },
      update: {},
      create: { centerName: 'IT Center', capacityId: capacities[1].id, value: 2048 },
    }),
    prisma.wallet.upsert({
      where: { centerName_capacityId: { centerName: 'Operations Center', capacityId: capacities[2].id } },
      update: {},
      create: { centerName: 'Operations Center', capacityId: capacities[2].id, value: 50 },
    }),
    prisma.wallet.upsert({
      where: { centerName_capacityId: { centerName: 'Finance Center', capacityId: capacities[3].id } },
      update: {},
      create: { centerName: 'Finance Center', capacityId: capacities[3].id, value: 800 },
    }),
    prisma.wallet.upsert({
      where: { centerName_capacityId: { centerName: 'Research Center', capacityId: capacities[4].id } },
      update: {},
      create: { centerName: 'Research Center', capacityId: capacities[4].id, value: 4096 },
    }),
  ]);
  console.log(`Created ${wallets.length} wallets`);

  // ============================================
  // Request Models
  // ============================================

  /*
   * Test User Accounts — Keycloak Realm Prerequisites
   *
   * The following accounts must exist in the local Keycloak realm to log in during development.
   * DB User records are seeded below so roles persist through OIDC login without being reset.
   *
   * Username    | Role            | Center            | Managed Services
   * ------------|-----------------|-------------------|------------------------------------------
   * admin1      | ADMIN           | -                 | -
   * admin2      | ADMIN           | -                 | -
   * cm1         | CENTER_MANAGER  | IT Center         | -
   * mod1        | MODERATOR       | -                 | VM, Openshift, RUNAI, LLM
   * mod2        | MODERATOR       | -                 | NIFI, CAAS, KAFKA
   * mod3        | MODERATOR       | -                 | HDFS, NAS, S3
   * mod4        | MODERATOR       | -                 | MongoK, MongoVM, Postgres (PG)
   * mod5        | MODERATOR       | -                 | Oracle, MSSQL
   * mod6        | MODERATOR       | -                 | ECK, Redis, Spark
   * mod7        | MODERATOR       | -                 | Spark, RUNAI, LLM, KAFKA
   * user1       | REGULAR_USER    | IT Center         | -
   * user2       | REGULAR_USER    | IT Center         | -
   * user3       | REGULAR_USER    | Operations Center | -
   */

  // Keycloak users (username = username, since UUIDs are generated at realm import)
  const USERS = {
    admin1: { username: 'admin1', name: 'Admin One' },
    admin2: { username: 'admin2', name: 'Admin Two' },
    cm1: { username: 'cm1', name: 'Center Manager One' },
    mod1: { username: 'mod1', name: 'Moderator One' },
    mod2: { username: 'mod2', name: 'Moderator Two' },
    mod3: { username: 'mod3', name: 'Moderator Three' },
    mod4: { username: 'mod4', name: 'Moderator Four' },
    mod5: { username: 'mod5', name: 'Moderator Five' },
    mod6: { username: 'mod6', name: 'Moderator Six' },
    mod7: { username: 'mod7', name: 'Moderator Seven' },
    user1: { username: 'user1', name: 'User One' },
    user2: { username: 'user2', name: 'User Two' },
    user3: { username: 'user3', name: 'User Three' },
  };

  const creators = [USERS.user1, USERS.user2, USERS.user3];

  // ============================================
  // Project Kind Models
  // ============================================

  const projectKinds = await Promise.all([
    prisma.projectKind.upsert({
      where: { name: 'App' },
      update: {},
      create: { name: 'App' },
    }),
    prisma.projectKind.upsert({
      where: { name: 'Track' },
      update: {},
      create: { name: 'Track' },
    }),
  ]);
  console.log(`Created ${projectKinds.length} project kinds`);

  // ============================================
  // Emergency Option Models
  // ============================================

  const emergencyOptions = await Promise.all([
    prisma.emergencyOption.upsert({
      where: { name: 'Security Breach' },
      update: {},
      create: { name: 'Security Breach' },
    }),
    prisma.emergencyOption.upsert({
      where: { name: 'System Failure' },
      update: {},
      create: { name: 'System Failure' },
    }),
    prisma.emergencyOption.upsert({
      where: { name: 'Data Loss' },
      update: {},
      create: { name: 'Data Loss' },
    }),
    prisma.emergencyOption.upsert({
      where: { name: 'Compliance Requirement' },
      update: {},
      create: { name: 'Compliance Requirement' },
    }),
  ]);
  console.log(`Created ${emergencyOptions.length} emergency options`);

  // Define Sections map for easier assignment
  const SECTIONS = [
    { name: 'Backend Team', branchName: 'Development', centerName: 'IT Center' },
    { name: 'Frontend Team', branchName: 'Development', centerName: 'IT Center' },
    { name: 'Cloud Team', branchName: 'Infrastructure', centerName: 'IT Center' },
    { name: 'Warehouse', branchName: 'Logistics', centerName: 'Operations Center' },
    { name: 'Payroll', branchName: 'Accounting', centerName: 'Finance Center' },
  ];

  const projectList = [
    { name: 'Cloud Migration', purpose: 'Migrate legacy apps to cloud', relatedTo: 'Cloud Platform', type: ProjectType.Semiannual, kind: 'App', year: 2026, median: Median.H1, priority: Priority.P1, sectionId: 2 }, // Cloud Team
    { name: 'Database Upgrade', purpose: 'Upgrade PostgreSQL clusters', relatedTo: 'DB Management', type: ProjectType.Emergency, kind: 'Track', year: undefined, median: undefined, priority: Priority.P1, sectionId: 0, emergencyOption: 'System Failure' }, // Backend Team
    { name: 'New API Platform', purpose: 'Build new API gateway', relatedTo: 'API Gateway', type: ProjectType.Semiannual, kind: 'App', year: 2026, median: Median.H2, priority: Priority.P2, sectionId: 0 }, // Backend Team
    { name: 'DR Setup', purpose: 'Setup disaster recovery site', relatedTo: undefined, type: ProjectType.Semiannual, kind: 'Track', year: 2026, median: Median.H1, priority: Priority.P1, sectionId: 2 }, // Cloud Team
    { name: 'Dev Environment', purpose: 'New development environment', relatedTo: 'DevOps', type: ProjectType.Emergency, kind: 'App', year: undefined, median: undefined, priority: Priority.P1, sectionId: 2, emergencyOption: 'System Failure' }, // Cloud Team
    { name: 'Legacy Decom', purpose: 'Decommission old servers', relatedTo: undefined, type: ProjectType.Semiannual, kind: 'Track', year: 2026, median: Median.H1, priority: Priority.P3, sectionId: 2 }, // Cloud Team
    { name: 'AI Research', purpose: 'AI model training infrastructure', relatedTo: 'ML Pipeline', type: ProjectType.Semiannual, kind: 'App', year: 2026, median: Median.H2, priority: Priority.P2, sectionId: 0 }, // Backend Team
    { name: 'Network Refresh', purpose: 'Upgrade core switches', relatedTo: 'Network Infra', type: ProjectType.Emergency, kind: 'Track', year: 2026, median: Median.H1, priority: Priority.P1, sectionId: 2, emergencyOption: 'Security Breach' }, // Cloud Team (approx)
    { name: 'Storage Expansion', purpose: 'Add more storage capacity', relatedTo: undefined, type: ProjectType.Semiannual, kind: 'Track', year: 2026, median: Median.H2, priority: Priority.P2, sectionId: 2 }, // Cloud Team
    { name: 'Kubernetes Upgrade', purpose: 'Upgrade K8s clusters', relatedTo: 'K8s Platform', type: ProjectType.Emergency, kind: 'Track', year: 2026, median: Median.H1, priority: Priority.P1, sectionId: 2, emergencyOption: 'Compliance Requirement' }, // Cloud Team
    { name: 'Security Audit', purpose: 'Infrastructure for security audit', relatedTo: 'Security Suite', type: ProjectType.Semiannual, kind: 'App', year: 2026, median: Median.H2, priority: Priority.P2, sectionId: 0 }, // Backend Team
    { name: 'Big Data Platform', purpose: 'Hadoop cluster setup', relatedTo: 'Big Data', type: ProjectType.Semiannual, kind: 'App', year: 2026, median: Median.H1, priority: Priority.P2, sectionId: 0 }, // Backend Team
    { name: 'CRM Integration', purpose: 'Integrate new CRM system', relatedTo: 'CRM System', type: ProjectType.Emergency, kind: 'App', year: 2026, median: Median.H2, priority: Priority.P1, sectionId: 1, emergencyOption: 'Data Loss' }, // Frontend Team
    { name: 'ERP Migration', purpose: 'Migrate ERP to cloud', relatedTo: undefined, type: ProjectType.Semiannual, kind: 'Track', year: 2026, median: Median.H1, priority: Priority.P1, sectionId: 4 }, // Payroll (Finance)
    { name: 'Mobile App Backend', purpose: 'Backend for new mobile app', relatedTo: 'Mobile App', type: ProjectType.Semiannual, kind: 'App', year: 2026, median: Median.H2, priority: Priority.P2, sectionId: 0 }, // Backend Team
  ];

  const projects = await Promise.all(
    projectList.map((p, index) => {
      const creator = creators[index % creators.length];
      const location = locations[index % locations.length];
      const section = SECTIONS[p.sectionId || 0];

      return prisma.project.upsert({
        where: { name: p.name },
        update: {},
        create: {
          name: p.name,
          purpose: p.purpose,
          relatedTo: p.relatedTo,
          type: p.type,
          kindName: p.kind,
          locationId: location.id,
          year: p.year,
          median: p.median,
          priority: p.priority,
          centerName: section.centerName,
          branchName: section.branchName,
          sectionName: section.name,
          emergencyOptionName: p.type === ProjectType.Emergency ? (p as any).emergencyOption : undefined,
          createdBy: creator.username,
          createdByName: creator.name,
        },
      });
    })
  );
  console.log(`Created ${projects.length} projects`);

  // Clear existing demands to avoid duplicates
  await prisma.demand.deleteMany({
    where: {
      projectName: { in: projects.map((p) => p.name) },
    },
  });

  const resourceOptions = [
    { serviceName: 'VM', resourceName: 'vCPU', resourceService: 'VM', unit: 'count', maxVal: 500 },
    { serviceName: 'VM', resourceName: 'Memory', resourceService: 'VM', unit: 'GB', maxVal: 1024 },
    { serviceName: 'HDFS', resourceName: 'Space Quota', resourceService: 'HDFS', unit: 'GB', maxVal: 100000 },
    { serviceName: 'KAFKA', resourceName: 'Throughput in', resourceService: 'KAFKA', unit: 'MB/s', maxVal: 10000 },
    { serviceName: 'Openshift', resourceName: 'Pods', resourceService: 'Openshift', unit: 'count', maxVal: 200 },
  ];

  // Need at least 50 demands
  const demandPromises = [];
  const statuses = [DemandStatus.Pending, DemandStatus.Approved, DemandStatus.Rejected, DemandStatus.PartiallyApproved, DemandStatus.ApprovedWithCondition];
  const types = [DemandType.New, DemandType.Extension];

  // Sample reasons for seed data
  const sampleReasons = [
    'Budget constraints require reduced allocation',
    'Resource availability limited in this location',
    'Pending approval from finance department',
    'Conditional on completion of security review',
    'Approved with monitoring requirements',
    'Requires quarterly review of usage',
    'Limited availability due to other projects',
    'Approved subject to capacity planning review',
  ];

  for (let i = 0; i < 50; i++) {
    const project = projects[i % projects.length];
    const resource = resourceOptions[i % resourceOptions.length];
    const creator = creators[i % creators.length];
    const status = statuses[i % statuses.length];
    const type = types[i % types.length];

    const val = Math.floor(Math.random() * resource.maxVal) + 1;

    let approvedValue = undefined;
    let approvedDate = undefined;
    let reason = undefined;

    if (status === DemandStatus.Approved) {
      approvedValue = val;
      approvedDate = new Date();
    } else if (status === DemandStatus.PartiallyApproved) {
      approvedValue = Math.floor(val * 0.8);
      approvedDate = new Date();
      reason = sampleReasons[i % sampleReasons.length];
    } else if (status === DemandStatus.ApprovedWithCondition) {
      approvedValue = val;
      approvedDate = new Date();
      reason = sampleReasons[(i + 3) % sampleReasons.length];
    } else if (status === DemandStatus.Rejected) {
      reason = sampleReasons[(i + 5) % sampleReasons.length];
    }

    demandPromises.push(
      prisma.demand.create({
        data: {
          projectName: project.name,
          serviceName: resource.serviceName,
          resourceName: resource.resourceName,
          resourceService: resource.resourceService,
          value: val,
          locationId: project.locationId,
          type: type,
          status: status,
          approvedValue,
          approvedDate,
          reason,
          centerName: project.centerName,
          branchName: project.branchName,
          sectionName: project.sectionName,
          createdBy: creator.username,
          createdByName: creator.name,
        },
      })
    );
  }

  const demands = await Promise.all(demandPromises);
  console.log(`Created ${demands.length} demands`);

  // Update allocated and available using PostgreSQL functions
  await prisma.$executeRaw`
    UPDATE "Capacity"
    SET
      "allocated" = calculate_allocated(id),
      "available" = calculate_available(id)
  `;

  console.log('Updated capacity allocated and available values');

  // ============================================
  // User Records
  // ============================================

  await Promise.all([
    prisma.user.upsert({
      where: { username: 'admin1' },
      create: { username: 'admin1', fullName: 'Admin One', role: UserRole.ADMIN, centerName: null },
      update: { fullName: 'Admin One' },
    }),
    prisma.user.upsert({
      where: { username: 'admin2' },
      create: { username: 'admin2', fullName: 'Admin Two', role: UserRole.ADMIN, centerName: null },
      update: { fullName: 'Admin Two' },
    }),
    prisma.user.upsert({
      where: { username: 'cm1' },
      create: { username: 'cm1', fullName: 'Center Manager One', role: UserRole.CENTER_MANAGER, centerName: 'IT Center' },
      update: { fullName: 'Center Manager One' },
    }),
    prisma.user.upsert({
      where: { username: 'mod1' },
      create: { username: 'mod1', fullName: 'Moderator One', role: UserRole.MODERATOR, centerName: null },
      update: { fullName: 'Moderator One' },
    }),
    prisma.user.upsert({
      where: { username: 'mod2' },
      create: { username: 'mod2', fullName: 'Moderator Two', role: UserRole.MODERATOR, centerName: null },
      update: { fullName: 'Moderator Two' },
    }),
    prisma.user.upsert({
      where: { username: 'mod3' },
      create: { username: 'mod3', fullName: 'Moderator Three', role: UserRole.MODERATOR, centerName: null },
      update: { fullName: 'Moderator Three' },
    }),
    prisma.user.upsert({
      where: { username: 'mod4' },
      create: { username: 'mod4', fullName: 'Moderator Four', role: UserRole.MODERATOR, centerName: null },
      update: { fullName: 'Moderator Four' },
    }),
    prisma.user.upsert({
      where: { username: 'mod5' },
      create: { username: 'mod5', fullName: 'Moderator Five', role: UserRole.MODERATOR, centerName: null },
      update: { fullName: 'Moderator Five' },
    }),
    prisma.user.upsert({
      where: { username: 'mod6' },
      create: { username: 'mod6', fullName: 'Moderator Six', role: UserRole.MODERATOR, centerName: null },
      update: { fullName: 'Moderator Six' },
    }),
    prisma.user.upsert({
      where: { username: 'mod7' },
      create: { username: 'mod7', fullName: 'Moderator Seven', role: UserRole.MODERATOR, centerName: null },
      update: { fullName: 'Moderator Seven' },
    }),
    prisma.user.upsert({
      where: { username: 'user1' },
      create: { username: 'user1', fullName: 'User One', role: UserRole.REGULAR_USER, centerName: 'IT Center' },
      update: { fullName: 'User One' },
    }),
    prisma.user.upsert({
      where: { username: 'user2' },
      create: { username: 'user2', fullName: 'User Two', role: UserRole.REGULAR_USER, centerName: 'IT Center' },
      update: { fullName: 'User Two' },
    }),
    prisma.user.upsert({
      where: { username: 'user3' },
      create: { username: 'user3', fullName: 'User Three', role: UserRole.REGULAR_USER, centerName: 'Operations Center' },
      update: { fullName: 'User Three' },
    }),
  ]);
  console.log('Seeded 13 user records (admin1, admin2, cm1, mod1-mod7, user1-user3)');

  // ============================================
  // E2E Test Scenario
  // ============================================

  const e2eProject = await prisma.project.upsert({
    where: { name: 'E2E Test Project' },
    update: {},
    create: {
      name: 'E2E Test Project',
      purpose: 'End-to-end testing of the RBAC approval flow',
      type: ProjectType.Semiannual,
      kindName: 'App',
      locationId: locations[0].id,
      year: 2026,
      median: Median.H1,
      priority: Priority.P1,
      centerName: 'IT Center',
      branchName: 'Development',
      sectionName: 'Backend Team',
      createdBy: 'user1',
      createdByName: 'User One',
    },
  });

  await prisma.demand.deleteMany({ where: { projectName: 'E2E Test Project' } });

  // Demand A: awaiting center manager approval (user1 → cm1 flow)
  await prisma.demand.create({
    data: {
      projectName: 'E2E Test Project',
      serviceName: 'VM',
      resourceName: 'vCPU',
      resourceService: 'VM',
      value: 16,
      locationId: locations[0].id,
      type: DemandType.New,
      status: DemandStatus.PendingCenterManager,
      centerName: 'IT Center',
      branchName: 'Development',
      sectionName: 'Backend Team',
      createdBy: 'user1',
      createdByName: 'User One',
    },
  });

  // Demand B: awaiting moderator approval (after CM approval, user1 → mod1 flow)
  await prisma.demand.create({
    data: {
      projectName: 'E2E Test Project',
      serviceName: 'VM',
      resourceName: 'Memory',
      resourceService: 'VM',
      value: 32,
      locationId: locations[0].id,
      type: DemandType.New,
      status: DemandStatus.Pending,
      centerName: 'IT Center',
      branchName: 'Development',
      sectionName: 'Backend Team',
      createdBy: 'user1',
      createdByName: 'User One',
    },
  });

  console.log('Created E2E test scenario (project + 2 demands for user1)');

  // ============================================
  // Full Coverage: Projects for admin1 and mod1
  // ============================================

  const privilegedProjects = await Promise.all([
    prisma.project.upsert({
      where: { name: 'Admin Infrastructure Review' },
      update: {},
      create: {
        name: 'Admin Infrastructure Review',
        purpose: 'Annual infrastructure capacity review',
        type: ProjectType.Semiannual,
        kindName: 'Track',
        locationId: locations[0].id,
        year: 2026, median: Median.H1, priority: Priority.P1,
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.admin1.username, createdByName: USERS.admin1.name,
      },
    }),
    prisma.project.upsert({
      where: { name: 'Admin Security Assessment' },
      update: {},
      create: {
        name: 'Admin Security Assessment',
        purpose: 'AI-assisted security audit tooling',
        type: ProjectType.Semiannual,
        kindName: 'App',
        locationId: locations[1].id,
        year: 2026, median: Median.H2, priority: Priority.P2,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.admin1.username, createdByName: USERS.admin1.name,
      },
    }),
    prisma.project.upsert({
      where: { name: 'Admin Capacity Planning' },
      update: {},
      create: {
        name: 'Admin Capacity Planning',
        purpose: 'Emergency VM provisioning for Q3 peak',
        type: ProjectType.Emergency,
        kindName: 'Track',
        locationId: locations[0].id,
        year: 2026, median: undefined, priority: Priority.P1,
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        emergencyOptionName: 'System Failure',
        createdBy: USERS.admin1.username, createdByName: USERS.admin1.name,
      },
    }),
    prisma.project.upsert({
      where: { name: 'Moderator GPU Cluster' },
      update: {},
      create: {
        name: 'Moderator GPU Cluster',
        purpose: 'Dedicated GPU cluster for model training',
        type: ProjectType.Semiannual,
        kindName: 'App',
        locationId: locations[0].id,
        year: 2026, median: Median.H1, priority: Priority.P2,
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.mod1.username, createdByName: USERS.mod1.name,
      },
    }),
    prisma.project.upsert({
      where: { name: 'Moderator ML Pipeline' },
      update: {},
      create: {
        name: 'Moderator ML Pipeline',
        purpose: 'End-to-end ML training and inference pipeline',
        type: ProjectType.Semiannual,
        kindName: 'App',
        locationId: locations[1].id,
        year: 2026, median: Median.H2, priority: Priority.P2,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.mod1.username, createdByName: USERS.mod1.name,
      },
    }),
  ]);
  console.log(`Created ${privilegedProjects.length} privileged-user projects`);

  // Demands for admin1 and mod1 projects
  await Promise.all([
    prisma.demand.upsert({
      where: { id: 1001 },
      update: {},
      create: {
        id: 1001,
        projectName: 'Admin Infrastructure Review',
        serviceName: 'VM', resourceName: 'vCPU', resourceService: 'VM',
        value: 200, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.Approved, approvedValue: 200, approvedDate: new Date(),
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.admin1.username, createdByName: USERS.admin1.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 1002 },
      update: {},
      create: {
        id: 1002,
        projectName: 'Admin Security Assessment',
        serviceName: 'LLM', resourceName: 'Model Size', resourceService: 'LLM',
        value: 3, locationId: locations[1].id, type: DemandType.New,
        status: DemandStatus.Pending,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.admin1.username, createdByName: USERS.admin1.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 1003 },
      update: {},
      create: {
        id: 1003,
        projectName: 'Admin Capacity Planning',
        serviceName: 'VM', resourceName: 'Memory', resourceService: 'VM',
        value: 512, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.PendingCenterManager,
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.admin1.username, createdByName: USERS.admin1.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 1004 },
      update: {},
      create: {
        id: 1004,
        projectName: 'Moderator GPU Cluster',
        serviceName: 'RUNAI', resourceName: 'GPU', resourceService: 'RUNAI',
        value: 8, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.Approved, approvedValue: 8, approvedDate: new Date(),
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.mod1.username, createdByName: USERS.mod1.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 1005 },
      update: {},
      create: {
        id: 1005,
        projectName: 'Moderator ML Pipeline',
        serviceName: 'Openshift', resourceName: 'Pods', resourceService: 'Openshift',
        value: 50, locationId: locations[1].id, type: DemandType.New,
        status: DemandStatus.Pending,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.mod1.username, createdByName: USERS.mod1.name,
      },
    }),
  ]);
  console.log('Created demands for admin1 and mod1 projects');

  // ============================================
  // Workflow Scenario Demands (All Statuses)
  // ============================================

  const scenarioDemands = await Promise.all([
    // Scenario A: PendingCenterManager (3 demands)
    prisma.demand.upsert({
      where: { id: 2001 },
      update: {},
      create: {
        id: 2001,
        projectName: 'Cloud Migration',
        serviceName: 'VM', resourceName: 'vCPU', resourceService: 'VM',
        value: 64, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.PendingCenterManager,
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.user1.username, createdByName: USERS.user1.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 2002 },
      update: {},
      create: {
        id: 2002,
        projectName: 'AI Research',
        serviceName: 'RUNAI', resourceName: 'GPU', resourceService: 'RUNAI',
        value: 4, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.PendingCenterManager,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.user2.username, createdByName: USERS.user2.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 2003 },
      update: {},
      create: {
        id: 2003,
        projectName: 'Big Data Platform',
        serviceName: 'LLM', resourceName: 'Model Size', resourceService: 'LLM',
        value: 2, locationId: locations[1].id, type: DemandType.New,
        status: DemandStatus.PendingCenterManager,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.user3.username, createdByName: USERS.user3.name,
      },
    }),
    // Scenario B: Pending (3 demands)
    prisma.demand.upsert({
      where: { id: 2004 },
      update: {},
      create: {
        id: 2004,
        projectName: 'New API Platform',
        serviceName: 'Openshift', resourceName: 'Pods', resourceService: 'Openshift',
        value: 30, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.Pending,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.user1.username, createdByName: USERS.user1.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 2005 },
      update: {},
      create: {
        id: 2005,
        projectName: 'DR Setup',
        serviceName: 'VM', resourceName: 'Memory', resourceService: 'VM',
        value: 256, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.Pending,
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.user2.username, createdByName: USERS.user2.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 2006 },
      update: {},
      create: {
        id: 2006,
        projectName: 'Security Audit',
        serviceName: 'RUNAI', resourceName: 'CPU', resourceService: 'RUNAI',
        value: 16, locationId: locations[1].id, type: DemandType.Extension,
        status: DemandStatus.Pending,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.user3.username, createdByName: USERS.user3.name,
      },
    }),
    // Scenario C: CenterManagerRejected (2 demands)
    prisma.demand.upsert({
      where: { id: 2007 },
      update: {},
      create: {
        id: 2007,
        projectName: 'Legacy Decom',
        serviceName: 'VM', resourceName: 'vCPU', resourceService: 'VM',
        value: 128, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.CenterManagerRejected,
        reason: 'Budget not approved for this cycle',
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.user1.username, createdByName: USERS.user1.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 2008 },
      update: {},
      create: {
        id: 2008,
        projectName: 'Mobile App Backend',
        serviceName: 'LLM', resourceName: 'Model Size', resourceService: 'LLM',
        value: 1, locationId: locations[1].id, type: DemandType.New,
        status: DemandStatus.CenterManagerRejected,
        reason: 'Duplicate request — already covered by existing allocation',
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.user2.username, createdByName: USERS.user2.name,
      },
    }),
    // Scenario D: Approved (2 demands)
    prisma.demand.upsert({
      where: { id: 2009 },
      update: {},
      create: {
        id: 2009,
        projectName: 'Kubernetes Upgrade',
        serviceName: 'Openshift', resourceName: 'Memory', resourceService: 'Openshift',
        value: 128, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.Approved, approvedValue: 128, approvedDate: new Date(),
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.user1.username, createdByName: USERS.user1.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 2010 },
      update: {},
      create: {
        id: 2010,
        projectName: 'Storage Expansion',
        serviceName: 'VM', resourceName: 'GPU type', resourceService: 'VM',
        value: 2, locationId: locations[0].id, type: DemandType.Extension,
        status: DemandStatus.Approved, approvedValue: 2, approvedDate: new Date(),
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.user3.username, createdByName: USERS.user3.name,
      },
    }),
    // Scenario E: PartiallyApproved (2 demands)
    prisma.demand.upsert({
      where: { id: 2011 },
      update: {},
      create: {
        id: 2011,
        projectName: 'Cloud Migration',
        serviceName: 'RUNAI', resourceName: 'Memory', resourceService: 'RUNAI',
        value: 128, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.PartiallyApproved, approvedValue: 64, approvedDate: new Date(),
        reason: 'Capacity constraints — approved 50% for H1, remainder in H2',
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.user2.username, createdByName: USERS.user2.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 2012 },
      update: {},
      create: {
        id: 2012,
        projectName: 'Network Refresh',
        serviceName: 'Openshift', resourceName: 'Cores', resourceService: 'Openshift',
        value: 32, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.PartiallyApproved, approvedValue: 16, approvedDate: new Date(),
        reason: 'Shared cluster — approved half pending infrastructure expansion',
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.user1.username, createdByName: USERS.user1.name,
      },
    }),
    // Scenario F: ApprovedWithCondition (1 demand)
    prisma.demand.upsert({
      where: { id: 2013 },
      update: {},
      create: {
        id: 2013,
        projectName: 'AI Research',
        serviceName: 'LLM', resourceName: 'Model Size', resourceService: 'LLM',
        value: 5, locationId: locations[1].id, type: DemandType.New,
        status: DemandStatus.ApprovedWithCondition, approvedValue: 5, approvedDate: new Date(),
        reason: 'Approved — usage must be reviewed after 30 days and report submitted to admin',
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.user3.username, createdByName: USERS.user3.name,
      },
    }),
    // Scenario G: Rejected (2 demands)
    prisma.demand.upsert({
      where: { id: 2014 },
      update: {},
      create: {
        id: 2014,
        projectName: 'Dev Environment',
        serviceName: 'VM', resourceName: 'CPU', resourceService: 'VM',
        value: 500, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.Rejected,
        reason: 'Request exceeds allocated quota — please resubmit with justification',
        centerName: 'IT Center', branchName: 'Infrastructure', sectionName: 'Cloud Team',
        createdBy: USERS.user1.username, createdByName: USERS.user1.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 2015 },
      update: {},
      create: {
        id: 2015,
        projectName: 'Database Upgrade',
        serviceName: 'Openshift', resourceName: 'CPU', resourceService: 'Openshift',
        value: 64, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.Rejected,
        reason: 'Service not provisioned at this location — use Cluster-A instead',
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.user2.username, createdByName: USERS.user2.name,
      },
    }),
    // Scenario H: Cancelled (2 demands)
    prisma.demand.upsert({
      where: { id: 2016 },
      update: {},
      create: {
        id: 2016,
        projectName: 'CRM Integration',
        serviceName: 'VM', resourceName: 'vCPU', resourceService: 'VM',
        value: 32, locationId: locations[2].id, type: DemandType.New,
        status: DemandStatus.Cancelled,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Frontend Team',
        createdBy: USERS.user3.username, createdByName: USERS.user3.name,
      },
    }),
    prisma.demand.upsert({
      where: { id: 2017 },
      update: {},
      create: {
        id: 2017,
        projectName: 'ERP Migration',
        serviceName: 'RUNAI', resourceName: 'Storage', resourceService: 'RUNAI',
        value: 200, locationId: locations[0].id, type: DemandType.Extension,
        status: DemandStatus.Cancelled,
        centerName: 'Finance Center', branchName: 'Accounting', sectionName: 'Payroll',
        createdBy: USERS.user1.username, createdByName: USERS.user1.name,
      },
    }),
    // Scenario I: WaitingOnPrerequisite (internal ticket chain)
    prisma.demand.upsert({
      where: { id: 2018 },
      update: {},
      create: {
        id: 2018,
        projectName: 'New API Platform',
        serviceName: 'Openshift', resourceName: 'Memory', resourceService: 'Openshift',
        value: 64, locationId: locations[0].id, type: DemandType.New,
        status: DemandStatus.Pending,
        isInternalTicket: true,
        centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
        createdBy: USERS.mod1.username, createdByName: USERS.mod1.name,
      },
    }),
  ]);

  await prisma.demand.upsert({
    where: { id: 2019 },
    update: {},
    create: {
      id: 2019,
      projectName: 'New API Platform',
      serviceName: 'VM', resourceName: 'vCPU', resourceService: 'VM',
      value: 48, locationId: locations[0].id, type: DemandType.New,
      status: DemandStatus.WaitingOnPrerequisite,
      prerequisiteDemandId: 2018,
      centerName: 'IT Center', branchName: 'Development', sectionName: 'Backend Team',
      createdBy: USERS.user1.username, createdByName: USERS.user1.name,
    },
  });

  console.log(`Created ${scenarioDemands.length + 1} workflow scenario demands`);

  await seedCloudMonitor();

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
