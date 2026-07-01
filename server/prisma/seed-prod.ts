import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding production database with reference data only (no mock data)...');

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

  // ============================================
  // Service Models (Production: no moderators assigned)
  // ============================================
  // Moderators will be assigned via the Settings UI after deployment.
  // Admins use the User Management interface to map Keycloak usernames
  // to service responsibility.

  const services = await Promise.all([
    // Storage
    prisma.service.upsert({ where: { name: 'HDFS' }, update: {}, create: { name: 'HDFS', displayName: 'Hadoop Distributed File System', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'NAS' }, update: {}, create: { name: 'NAS', displayName: 'Network Attached Storage', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'S3' }, update: {}, create: { name: 'S3', displayName: 'S3 Object Storage', moderators: [], isActive: true } }),
    // Databases
    prisma.service.upsert({ where: { name: 'MongoK' }, update: {}, create: { name: 'MongoK', displayName: 'MongoDB on Kubernetes', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'MongoVM' }, update: {}, create: { name: 'MongoVM', displayName: 'MongoDB on VM', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'Postgres (PG)' }, update: {}, create: { name: 'Postgres (PG)', displayName: 'PostgreSQL', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'ECK' }, update: {}, create: { name: 'ECK', displayName: 'Elastic Cloud on Kubernetes', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'Redis' }, update: {}, create: { name: 'Redis', displayName: 'Redis In-Memory Store', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'Oracle' }, update: {}, create: { name: 'Oracle', displayName: 'Oracle Database', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'MSSQL' }, update: {}, create: { name: 'MSSQL', displayName: 'Microsoft SQL Server', moderators: [], isActive: true } }),
    // Processing
    prisma.service.upsert({ where: { name: 'Openshift' }, update: {}, create: { name: 'Openshift', displayName: 'Red Hat OpenShift', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'Spark' }, update: {}, create: { name: 'Spark', displayName: 'Apache Spark', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'VM' }, update: {}, create: { name: 'VM', displayName: 'Virtual Machine', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'RUNAI' }, update: {}, create: { name: 'RUNAI', displayName: 'Run:AI GPU Orchestration', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'LLM' }, update: {}, create: { name: 'LLM', displayName: 'Large Language Model', moderators: [], isActive: true } }),
    // Data Transport
    prisma.service.upsert({ where: { name: 'NIFI' }, update: {}, create: { name: 'NIFI', displayName: 'Apache NiFi', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'CAAS' }, update: {}, create: { name: 'CAAS', displayName: 'Connectivity as a Service', moderators: [], isActive: true } }),
    prisma.service.upsert({ where: { name: 'KAFKA' }, update: {}, create: { name: 'KAFKA', displayName: 'Apache Kafka', moderators: [], isActive: true } }),
  ]);
  console.log(`Created ${services.length} services`);

  // ============================================
  // Resource Models
  // ============================================

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

  console.log('✓ Production seed complete. Ready for org configuration via the UI.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
