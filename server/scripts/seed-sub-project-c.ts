import * as dotenv from 'dotenv';
import { PrismaClient, ProjectType, Median, Priority, DemandStatus, DemandType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local if it exists (for local development), otherwise load .env
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');
const configPath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
dotenv.config({ path: configPath });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data for Sub-Project C...');

  // Ensure Center A exists
  await prisma.center.upsert({
    where: { name: 'Center A' },
    update: {},
    create: {
      name: 'Center A',
      displayName: 'Center A',
      isActive: true
    }
  });

  // Ensure Center B exists
  await prisma.center.upsert({
    where: { name: 'Center B' },
    update: {},
    create: {
      name: 'Center B',
      displayName: 'Center B',
      isActive: true
    }
  });

  // Clear existing test data
  await prisma.project.deleteMany({
    where: {
      name: { in: ['Project Alpha', 'Project Beta', 'Project Gamma'] }
    }
  });

  await prisma.user.deleteMany({
    where: {
      username: { in: ['admin1', 'mod1', 'manager1', 'user1'] }
    }
  });

  // Create test users
  const admin = await prisma.user.create({
    data: {
      username: 'admin1',
      fullName: 'Admin User',
      role: 'ADMIN',
      centerName: null
    }
  });

  const moderator = await prisma.user.create({
    data: {
      username: 'mod1',
      fullName: 'Moderator User',
      role: 'MODERATOR',
      centerName: null
    }
  });

  const centerManager = await prisma.user.create({
    data: {
      username: 'manager1',
      fullName: 'Center Manager User',
      role: 'CENTER_MANAGER',
      centerName: 'Center A'
    }
  });

  const user = await prisma.user.create({
    data: {
      username: 'user1',
      fullName: 'Regular User',
      role: 'REGULAR_USER',
      centerName: null
    }
  });

  console.log('✅ Created test users:');
  console.log(`  - ${admin.username} (${admin.role})`);
  console.log(`  - ${moderator.username} (${moderator.role})`);
  console.log(`  - ${centerManager.username} (${centerManager.role})`);
  console.log(`  - ${user.username} (${user.role})`);

  // Create necessary supporting entities for projects
  // Create ProjectKind
  const projectKind = await prisma.projectKind.upsert({
    where: { name: 'Test' },
    update: {},
    create: { name: 'Test', displayName: 'Test Projects' }
  });

  // Create Base, Environment, Network, Cluster for Location
  const base = await prisma.base.upsert({
    where: { name: 'Test Base' },
    update: {},
    create: { name: 'Test Base', displayName: 'Test Base', isActive: true }
  });

  const environment = await prisma.environment.upsert({
    where: { name: 'Test Environment' },
    update: {},
    create: { name: 'Test Environment', displayName: 'Test Env', isActive: true }
  });

  const network = await prisma.network.upsert({
    where: { name: 'Test Network' },
    update: {},
    create: { name: 'Test Network', displayName: 'Test Network', isActive: true }
  });

  const cluster = await prisma.cluster.upsert({
    where: { name: 'Test Cluster' },
    update: {},
    create: { name: 'Test Cluster', displayName: 'Test Cluster', isActive: true }
  });

  // Create Location
  const location = await prisma.location.upsert({
    where: {
      baseName_environmentName_networkName_clusterName: {
        baseName: 'Test Base',
        environmentName: 'Test Environment',
        networkName: 'Test Network',
        clusterName: 'Test Cluster'
      }
    },
    update: {},
    create: {
      baseName: 'Test Base',
      environmentName: 'Test Environment',
      networkName: 'Test Network',
      clusterName: 'Test Cluster',
      isActive: true
    }
  });

  // Create branches and sections for Center A and Center B
  const branchA = await prisma.branch.upsert({
    where: { name_centerName: { name: 'Branch A', centerName: 'Center A' } },
    update: {},
    create: { name: 'Branch A', centerName: 'Center A', displayName: 'Branch A', isActive: true }
  });

  const sectionA = await prisma.section.upsert({
    where: { name_branchName_branchCenter: { name: 'Section A', branchName: 'Branch A', branchCenter: 'Center A' } },
    update: {},
    create: { name: 'Section A', branchName: 'Branch A', branchCenter: 'Center A', displayName: 'Section A', isActive: true }
  });

  const branchB = await prisma.branch.upsert({
    where: { name_centerName: { name: 'Branch B', centerName: 'Center B' } },
    update: {},
    create: { name: 'Branch B', centerName: 'Center B', displayName: 'Branch B', isActive: true }
  });

  const sectionB = await prisma.section.upsert({
    where: { name_branchName_branchCenter: { name: 'Section B', branchName: 'Branch B', branchCenter: 'Center B' } },
    update: {},
    create: { name: 'Section B', branchName: 'Branch B', branchCenter: 'Center B', displayName: 'Section B', isActive: true }
  });

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Project Alpha',
      purpose: 'Test project for Center A',
      type: ProjectType.Semiannual,
      kindName: 'Test',
      locationId: location.id,
      year: 2026,
      median: Median.H1,
      priority: Priority.P1,
      centerName: 'Center A',
      branchName: 'Branch A',
      sectionName: 'Section A',
      createdBy: user.username,
      createdByName: user.fullName
    }
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Project Beta',
      purpose: 'Another project for Center A',
      type: ProjectType.Semiannual,
      kindName: 'Test',
      locationId: location.id,
      year: 2026,
      median: Median.H2,
      priority: Priority.P2,
      centerName: 'Center A',
      branchName: 'Branch A',
      sectionName: 'Section A',
      createdBy: admin.username,
      createdByName: admin.fullName
    }
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Project Gamma',
      purpose: 'Test project for Center B',
      type: ProjectType.Emergency,
      kindName: 'Test',
      locationId: location.id,
      priority: Priority.P1,
      centerName: 'Center B',
      branchName: 'Branch B',
      sectionName: 'Section B',
      createdBy: user.username,
      createdByName: user.fullName
    }
  });

  console.log('✅ Created test projects:');
  console.log(`  - ${project1.name} (${project1.centerName})`);
  console.log(`  - ${project2.name} (${project2.centerName})`);
  console.log(`  - ${project3.name} (${project3.centerName})`);

  // Create services
  const vmService = await prisma.service.upsert({
    where: { name: 'VM' },
    update: {},
    create: { name: 'VM', isActive: true }
  });

  const hdfsService = await prisma.service.upsert({
    where: { name: 'HDFS' },
    update: {},
    create: { name: 'HDFS', isActive: true }
  });

  const kafkaService = await prisma.service.upsert({
    where: { name: 'KAFKA' },
    update: {},
    create: { name: 'KAFKA', isActive: true }
  });

  // Create resources for VM service
  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'vCPU', serviceName: 'VM' } },
    update: {},
    create: { name: 'vCPU', unit: 'count', serviceName: 'VM', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Memory', serviceName: 'VM' } },
    update: {},
    create: { name: 'Memory', unit: 'GB', serviceName: 'VM', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'CPU', serviceName: 'VM' } },
    update: {},
    create: { name: 'CPU', unit: 'GHz', serviceName: 'VM', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'GPU type', serviceName: 'VM' } },
    update: {},
    create: { name: 'GPU type', unit: 'A100/T4/H100', serviceName: 'VM', isActive: true }
  });

  // Create resources for HDFS service
  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Files Amount', serviceName: 'HDFS' } },
    update: {},
    create: { name: 'Files Amount', unit: 'count', serviceName: 'HDFS', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Space Quota', serviceName: 'HDFS' } },
    update: {},
    create: { name: 'Space Quota', unit: 'GB', serviceName: 'HDFS', isActive: true }
  });

  // Create resources for KAFKA service
  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Storage (no backup)', serviceName: 'KAFKA' } },
    update: {},
    create: { name: 'Storage (no backup)', unit: 'GB', serviceName: 'KAFKA', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Throughput in', serviceName: 'KAFKA' } },
    update: {},
    create: { name: 'Throughput in', unit: 'MB/s', serviceName: 'KAFKA', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Throughput out', serviceName: 'KAFKA' } },
    update: {},
    create: { name: 'Throughput out', unit: 'MB/s', serviceName: 'KAFKA', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Partitions', serviceName: 'KAFKA' } },
    update: {},
    create: { name: 'Partitions', unit: 'count', serviceName: 'KAFKA', isActive: true }
  });

  // Helper function to create demands
  async function createDemand(
    project: any,
    serviceName: string,
    resourceName: string,
    value: number,
    unit: string,
    status: DemandStatus,
    createdBy: string,
    type: DemandType = DemandType.New
  ) {
    return await prisma.demand.create({
      data: {
        projectName: project.name,
        serviceName,
        resourceName,
        resourceService: serviceName,
        value,
        locationId: project.locationId,
        status,
        createdBy,
        createdByName: user.fullName,
        type,
        centerName: project.centerName,
        branchName: project.branchName,
        sectionName: project.sectionName
      }
    });
  }

  // Project 1 - 5 demands (VM + HDFS)
  const p1d1 = await createDemand(project1, 'VM', 'vCPU', 32, 'count', DemandStatus.Pending, user.username);
  const p1d2 = await createDemand(project1, 'VM', 'Memory', 128, 'GB', DemandStatus.Pending, user.username);
  const p1d3 = await createDemand(project1, 'VM', 'CPU', 2, 'GHz', DemandStatus.Pending, user.username);
  const p1d4 = await createDemand(project1, 'HDFS', 'Space Quota', 500, 'GB', DemandStatus.CenterManagerApproved, user.username);
  const p1d5 = await createDemand(project1, 'HDFS', 'Files Amount', 2000, 'count', DemandStatus.Approved, user.username);

  // Project 2 - 4 demands (VM + KAFKA)
  const p2d1 = await createDemand(project2, 'VM', 'vCPU', 8, 'count', DemandStatus.Pending, user.username);
  const p2d2 = await createDemand(project2, 'KAFKA', 'Throughput in', 100, 'MB/s', DemandStatus.Rejected, user.username);
  const p2d3 = await createDemand(project2, 'KAFKA', 'Partitions', 10, 'count', DemandStatus.ApprovedWithCondition, user.username);
  const p2d4 = await createDemand(project2, 'KAFKA', 'Storage (no backup)', 500, 'GB', DemandStatus.Cancelled, user.username);

  // Project 3 - 6 demands (HDFS + KAFKA + VM)
  const p3d1 = await createDemand(project3, 'HDFS', 'Files Amount', 5000, 'count', DemandStatus.Pending, user.username);
  const p3d2 = await createDemand(project3, 'HDFS', 'Space Quota', 1000, 'GB', DemandStatus.Rejected, user.username);
  const p3d3 = await createDemand(project3, 'KAFKA', 'Throughput in', 50, 'MB/s', DemandStatus.CenterManagerApproved, user.username);
  const p3d4 = await createDemand(project3, 'KAFKA', 'Throughput out', 1, 'MB/s', DemandStatus.CenterManagerApproved, user.username);
  const p3d5 = await createDemand(project3, 'VM', 'vCPU', 5, 'count', DemandStatus.PartiallyApproved, user.username);
  const p3d6 = await createDemand(project3, 'VM', 'Memory', 2, 'GB', DemandStatus.Approved, user.username);

  console.log('✅ Created test demands:');
  console.log(`  - Pending: 5`);
  console.log(`  - CenterManagerApproved: 3`);
  console.log(`  - Approved: 2`);
  console.log(`  - Rejected: 2`);
  console.log(`  - ApprovedWithCondition: 1`);
  console.log(`  - PartiallyApproved: 1`);
  console.log(`  - Cancelled: 1`);

  console.log('✅ Seeding complete');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
