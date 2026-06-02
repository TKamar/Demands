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
  const computeService = await prisma.service.upsert({
    where: { name: 'Compute' },
    update: {},
    create: { name: 'Compute', isActive: true }
  });

  const storageService = await prisma.service.upsert({
    where: { name: 'Storage' },
    update: {},
    create: { name: 'Storage', isActive: true }
  });

  const networkService = await prisma.service.upsert({
    where: { name: 'Network' },
    update: {},
    create: { name: 'Network', isActive: true }
  });

  // Create resources for Compute service
  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'CPU', serviceName: 'Compute' } },
    update: {},
    create: { name: 'CPU', unit: 'Cores', serviceName: 'Compute', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'RAM', serviceName: 'Compute' } },
    update: {},
    create: { name: 'RAM', unit: 'GB', serviceName: 'Compute', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'GPU', serviceName: 'Compute' } },
    update: {},
    create: { name: 'GPU', unit: 'Units', serviceName: 'Compute', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'vCPU', serviceName: 'Compute' } },
    update: {},
    create: { name: 'vCPU', unit: 'Cores', serviceName: 'Compute', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Kubernetes Nodes', serviceName: 'Compute' } },
    update: {},
    create: { name: 'Kubernetes Nodes', unit: 'Units', serviceName: 'Compute', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Load Balancer', serviceName: 'Compute' } },
    update: {},
    create: { name: 'Load Balancer', unit: 'Units', serviceName: 'Compute', isActive: true }
  });

  // Create resources for Storage service
  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'SSD', serviceName: 'Storage' } },
    update: {},
    create: { name: 'SSD', unit: 'GB', serviceName: 'Storage', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'HDD', serviceName: 'Storage' } },
    update: {},
    create: { name: 'HDD', unit: 'GB', serviceName: 'Storage', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Backup Space', serviceName: 'Storage' } },
    update: {},
    create: { name: 'Backup Space', unit: 'GB', serviceName: 'Storage', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Archive', serviceName: 'Storage' } },
    update: {},
    create: { name: 'Archive', unit: 'GB', serviceName: 'Storage', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Cache', serviceName: 'Storage' } },
    update: {},
    create: { name: 'Cache', unit: 'GB', serviceName: 'Storage', isActive: true }
  });

  // Create resources for Network service
  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Bandwidth', serviceName: 'Network' } },
    update: {},
    create: { name: 'Bandwidth', unit: 'Mbps', serviceName: 'Network', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'IP Addresses', serviceName: 'Network' } },
    update: {},
    create: { name: 'IP Addresses', unit: 'Units', serviceName: 'Network', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'VPN', serviceName: 'Network' } },
    update: {},
    create: { name: 'VPN', unit: 'Mbps', serviceName: 'Network', isActive: true }
  });

  await prisma.resource.upsert({
    where: { name_serviceName: { name: 'Firewall', serviceName: 'Network' } },
    update: {},
    create: { name: 'Firewall', unit: 'Units', serviceName: 'Network', isActive: true }
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

  // Project 1 - 5 demands
  const p1d1 = await createDemand(project1, 'Compute', 'CPU', 32, 'Cores', DemandStatus.Pending, user.username);
  const p1d2 = await createDemand(project1, 'Compute', 'RAM', 128, 'GB', DemandStatus.Pending, user.username);
  const p1d3 = await createDemand(project1, 'Compute', 'GPU', 2, 'Units', DemandStatus.Pending, user.username);
  const p1d4 = await createDemand(project1, 'Storage', 'SSD', 500, 'GB', DemandStatus.CenterManagerApproved, user.username);
  const p1d5 = await createDemand(project1, 'Storage', 'HDD', 2000, 'GB', DemandStatus.Approved, user.username);

  // Project 2 - 4 demands
  const p2d1 = await createDemand(project2, 'Compute', 'vCPU', 8, 'Cores', DemandStatus.Pending, user.username);
  const p2d2 = await createDemand(project2, 'Network', 'Bandwidth', 100, 'Mbps', DemandStatus.Rejected, user.username);
  const p2d3 = await createDemand(project2, 'Network', 'IP Addresses', 10, 'Units', DemandStatus.ApprovedWithCondition, user.username);
  const p2d4 = await createDemand(project2, 'Storage', 'Backup Space', 500, 'GB', DemandStatus.Cancelled, user.username);

  // Project 3 - 5 demands
  const p3d1 = await createDemand(project3, 'Storage', 'Archive', 5000, 'GB', DemandStatus.Pending, user.username);
  const p3d2 = await createDemand(project3, 'Storage', 'Cache', 1000, 'GB', DemandStatus.Rejected, user.username);
  const p3d3 = await createDemand(project3, 'Network', 'VPN', 50, 'Mbps', DemandStatus.CenterManagerApproved, user.username);
  const p3d4 = await createDemand(project3, 'Network', 'Firewall', 1, 'Units', DemandStatus.CenterManagerApproved, user.username);
  const p3d5 = await createDemand(project3, 'Compute', 'Kubernetes Nodes', 5, 'Units', DemandStatus.PartiallyApproved, user.username);
  const p3d6 = await createDemand(project3, 'Compute', 'Load Balancer', 2, 'Units', DemandStatus.Approved, user.username);

  console.log('✅ Created test demands:');
  console.log(`  - Pending: 4`);
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
