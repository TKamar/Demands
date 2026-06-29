import { Request, Response } from 'express';
import * as ExcelJS from 'exceljs';
import multer from 'multer';
import prisma from '../../lib/prisma';
import { DemandStatus, DemandType, ProjectType, Median, Priority } from '@prisma/client';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function importNewFormat(sheet: any, locations: any[], kindNames: Set<string>, resourceMap: Map<string, any>, errors: string[], created: any, user: any) {
  const projectRowsMap = new Map<string, any>();
  const demandRows: Record<string, any>[] = [];

  sheet.eachRow((row: any, rowNum: number) => {
    if (rowNum === 1) return;

    const getCell = (key: string) => {
      const cell = row.getCell(key);
      return cell?.value ?? '';
    };

    const center = String(getCell('center') ?? '').trim();
    const branch = String(getCell('branch') ?? '').trim();
    const section = String(getCell('section') ?? '').trim();
    const base = String(getCell('base') ?? '').trim();
    const network = String(getCell('network') ?? '').trim();
    const cluster = String(getCell('cluster') ?? '').trim();
    const environment = String(getCell('environment') ?? '').trim();
    const serviceResourceStr = String(getCell('serviceResource') ?? '').trim();
    const quantity = String(getCell('quantity') ?? '').trim();
    const priority = String(getCell('priority') ?? '').trim();
    const category = String(getCell('category') ?? '').trim();
    const projectName = String(getCell('projectName') ?? '').trim();
    const notes = String(getCell('notes') ?? '').trim();

    if (!center || !branch || !section) {
      errors.push(`Row ${rowNum}: שדות חובה חסרים (center, branch, section)`);
      return;
    }

    if (!base || !network || !environment || !cluster) {
      errors.push(`Row ${rowNum}: שדות מיקום חסרים`);
      return;
    }

    if (!projectName) {
      errors.push(`Row ${rowNum}: שם פרויקט חסר`);
      return;
    }

    if (!serviceResourceStr || !quantity) {
      errors.push(`Row ${rowNum}: שדות דרישה חסרים (service+resource, quantity)`);
      return;
    }

    const loc = locations.find((l: any) =>
      (l.base.displayName === base || l.baseName === base) &&
      (l.environment.displayName === environment || l.environmentName === environment) &&
      (l.network.displayName === network || l.networkName === network) &&
      (l.cluster.displayName === cluster || l.clusterName === cluster)
    );

    if (!loc) {
      errors.push(`Row ${rowNum}: מיקום לא נמצא (base: ${base}, env: ${environment}, net: ${network}, cluster: ${cluster})`);
      return;
    }

    const resource = resourceMap.get(serviceResourceStr);
    if (!resource) {
      errors.push(`Row ${rowNum}: שירות/משאב "${serviceResourceStr}" לא נמצא`);
      return;
    }

    if (!category || !kindNames.has(category)) {
      errors.push(`Row ${rowNum}: קטגוריה "${category}" לא חוקית`);
      return;
    }

    if (priority && !['1', '2', '3'].includes(priority)) {
      errors.push(`Row ${rowNum}: תעדוף חייב להיות 1, 2, או 3`);
      return;
    }

    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      errors.push(`Row ${rowNum}: כמות נדרשת חייבת להיות מספר חיובי`);
      return;
    }

    if (!projectRowsMap.has(projectName)) {
      projectRowsMap.set(projectName, {
        name: projectName,
        centerName: center,
        branchName: branch,
        sectionName: section,
        locationId: loc.id,
        kindName: category,
        priority: priority || undefined,
        createdBy: user.username,
        createdByName: user.fullName ?? user.username,
      });
    }

    demandRows.push({
      projectName,
      serviceName: resource.serviceName,
      resourceName: resource.name,
      value: numQuantity,
      centerName: center,
      branchName: branch,
      sectionName: section,
      locationId: loc.id,
      reason: notes || undefined,
    });
  });

  if (errors.length > 0) return;

  for (const p of projectRowsMap.values()) {
    const exists = await prisma.project.findUnique({ where: { name: p.name }, select: { name: true } });
    if (exists) {
      created.skipped++;
      continue;
    }
    await prisma.project.create({
      data: {
        name: p.name,
        purpose: 'Imported from template',
        type: 'Semiannual' as ProjectType,
        kindName: p.kindName,
        priority: p.priority as Priority | undefined,
        centerName: p.centerName,
        branchName: p.branchName,
        sectionName: p.sectionName,
        locationId: p.locationId,
        createdBy: p.createdBy,
        createdByName: p.createdByName,
      },
    });
    created.projects++;
  }

  for (const d of demandRows) {
    if (!projectRowsMap.has(d.projectName)) {
      const projectExists = await prisma.project.findUnique({ where: { name: d.projectName }, select: { name: true } });
      if (!projectExists) {
        errors.push(`Demand for project "${d.projectName}": פרויקט לא נמצא`);
        continue;
      }
    }
    try {
      await prisma.demand.create({
        data: {
          projectName: d.projectName,
          serviceName: d.serviceName,
          resourceName: d.resourceName,
          resourceService: d.serviceName,
          value: d.value,
          type: 'New' as DemandType,
          status: DemandStatus.PendingCenterManager,
          centerName: d.centerName,
          branchName: d.branchName,
          sectionName: d.sectionName,
          locationId: d.locationId,
          reason: d.reason,
          createdBy: user.username,
          createdByName: user.fullName ?? user.username,
        },
      });
      created.demands++;
    } catch (e) {
      errors.push(`Demand for project "${d.projectName}" / ${d.resourceName}: ${(e as Error).message}`);
    }
  }
}

async function importOldFormat(pSheet: any, dSheet: any, locations: any[], kindNames: Set<string>, errors: string[], created: any, user: any) {
  const projectRows: Record<string, any>[] = [];
  pSheet.eachRow((row: any, rowNum: number) => {
    if (rowNum === 1) return;
    const [name, purpose, relatedTo, type, kind, year, median, priority, centerName, branchName, sectionName, base, environment, network, cluster] =
      row.values as any[];
    if (!name || !purpose || !type || !kind || !centerName || !branchName || !sectionName) {
      errors.push(`Projects row ${rowNum}: שדות חובה חסרים (name, purpose, type, kind, center, branch, section)`);
      return;
    }
    if (!['Emergency', 'Semiannual'].includes(type)) {
      errors.push(`Projects row ${rowNum}: סוג לא חוקי "${type}". חייב להיות Emergency או Semiannual`);
      return;
    }
    if (!kindNames.has(kind)) {
      errors.push(`Projects row ${rowNum}: קטגוריה "${kind}" לא קיימת במערכת`);
      return;
    }
    const loc = locations.find((l: any) =>
      l.base.name === base && l.environment.name === environment &&
      l.network.name === network && l.cluster.name === cluster
    );
    if (!loc) {
      errors.push(`Projects row ${rowNum}: מיקום לא נמצא (${base}/${environment}/${network}/${cluster})`);
      return;
    }
    projectRows.push({ name, purpose, relatedTo: relatedTo || undefined, type, kindName: kind, year: year ? Number(year) : undefined, median: median || undefined, priority: priority || undefined, centerName, branchName, sectionName, locationId: loc.id });
  });

  const demandRows: Record<string, any>[] = [];
  dSheet.eachRow((row: any, rowNum: number) => {
    if (rowNum === 1) return;
    const [projectName, serviceName, resourceService, resourceName, value, , type, , centerName, branchName, sectionName, base, environment, network, cluster] =
      row.values as any[];
    if (!projectName || !serviceName || !resourceName || !value || !type || !centerName || !branchName || !sectionName) {
      errors.push(`Demands row ${rowNum}: שדות חובה חסרים`);
      return;
    }
    if (!['New', 'Extension'].includes(type)) {
      errors.push(`Demands row ${rowNum}: סוג לא חוקי "${type}"`);
      return;
    }
    const loc = locations.find((l: any) =>
      l.base.name === base && l.environment.name === environment &&
      l.network.name === network && l.cluster.name === cluster
    );
    if (!loc) {
      errors.push(`Demands row ${rowNum}: מיקום לא נמצא`);
      return;
    }
    demandRows.push({ projectName, serviceName, resourceService: resourceService || serviceName, resourceName, value: Number(value), type, centerName, branchName, sectionName, locationId: loc.id });
  });

  if (errors.length > 0) return;

  for (const p of projectRows) {
    const exists = await prisma.project.findUnique({ where: { name: p.name }, select: { name: true } });
    if (exists) { created.skipped++; continue; }
    await prisma.project.create({
      data: {
        name: p.name, purpose: p.purpose, relatedTo: p.relatedTo,
        type: p.type as ProjectType, kindName: p.kindName,
        year: p.year, median: p.median as Median | undefined,
        priority: p.priority as Priority | undefined,
        centerName: p.centerName, branchName: p.branchName, sectionName: p.sectionName,
        locationId: p.locationId,
        createdBy: user.username, createdByName: user.fullName ?? user.username,
      },
    });
    created.projects++;
  }

  const projectNameSet = new Set([...projectRows.map(p => p.name)]);
  for (const d of demandRows) {
    if (!projectNameSet.has(d.projectName)) {
      const projectExists = await prisma.project.findUnique({ where: { name: d.projectName }, select: { name: true } });
      if (!projectExists) { errors.push(`Demand for project "${d.projectName}": פרויקט לא נמצא`); continue; }
    }
    try {
      await prisma.demand.create({
        data: {
          projectName: d.projectName, serviceName: d.serviceName,
          resourceName: d.resourceName, resourceService: d.resourceService,
          value: d.value, type: d.type as DemandType,
          status: DemandStatus.PendingCenterManager,
          centerName: d.centerName, branchName: d.branchName, sectionName: d.sectionName,
          locationId: d.locationId,
          createdBy: user.username, createdByName: user.fullName ?? user.username,
        },
      });
      created.demands++;
    } catch (e) {
      errors.push(`Demand for project "${d.projectName}" / ${d.resourceName}: ${(e as Error).message}`);
    }
  }
}

export const excelController = {
  exportProjects: async (req: Request, res: Response) => {
    try {
      const centerFilter = typeof req.query.center === 'string' ? req.query.center : undefined;

      const projects = await prisma.project.findMany({
        where: centerFilter ? { centerName: centerFilter } : undefined,
        include: {
          location: true,
          kind: true,
          demands: {
            include: {
              location: true,
              resource: { select: { unit: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { demands: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const [locations, services, resources, kinds] = await Promise.all([
        prisma.location.findMany({ include: { base: true, environment: true, network: true, cluster: true } }),
        prisma.service.findMany(),
        prisma.resource.findMany(),
        prisma.projectKind.findMany(),
      ]);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Demands System';
      workbook.created = new Date();

      // Sheet 1: Main Form (טופס איסוף דרישות)
      const mainSheet = workbook.addWorksheet('טופס איסוף דרישות');
      mainSheet.views = [{ rightToLeft: true }];
      mainSheet.columns = [
        { header: 'מרכז', key: 'center', width: 20 },
        { header: 'ענף', key: 'branch', width: 20 },
        { header: 'מדור', key: 'section', width: 20 },
        { header: 'אתר', key: 'base', width: 18 },
        { header: 'רשת', key: 'network', width: 18 },
        { header: 'DC', key: 'cluster', width: 16 },
        { header: 'סוג סביבה', key: 'environment', width: 16 },
        { header: 'קלאסטר', key: 'clusterAlt', width: 16 },
        { header: 'שירות + סוג משאב', key: 'serviceResource', width: 28 },
        { header: 'יחידת מידה', key: 'unit', width: 14 },
        { header: 'כמות נדרשת', key: 'quantity', width: 14 },
        { header: 'מסלול (רק עבור CAAS)', key: 'route', width: 20 },
        { header: 'סוג שימוש (רק עבור ECK)', key: 'usageType', width: 22 },
        { header: 'תעדוף (1-3)', key: 'priority', width: 12 },
        { header: 'קטגוריה', key: 'category', width: 20 },
        { header: 'פרויקט אב / שם המאגר-מודל', key: 'projectName', width: 32 },
        { header: 'הערות', key: 'notes', width: 32 },
      ];
      const headerRow = mainSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FF1A237E' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
      headerRow.alignment = { horizontal: 'right' };

      projects.forEach((p: any) => {
        if (p.demands.length === 0) {
          mainSheet.addRow({
            center: p.centerName,
            branch: p.branchName,
            section: p.sectionName,
            base: p.location.base?.displayName || p.location.baseName,
            network: p.location.network?.displayName || p.location.networkName,
            cluster: p.location.cluster?.displayName || p.location.clusterName,
            environment: p.location.environment?.displayName || p.location.environmentName,
            clusterAlt: p.location.cluster?.displayName || p.location.clusterName,
            serviceResource: '',
            unit: '',
            quantity: '',
            route: '',
            usageType: '',
            priority: p.priority ?? '',
            category: p.kindName,
            projectName: p.name,
            notes: '',
          });
        } else {
          p.demands.forEach((d: any) => {
            mainSheet.addRow({
              center: p.centerName,
              branch: p.branchName,
              section: p.sectionName,
              base: d.location.base?.displayName || d.location.baseName,
              network: d.location.network?.displayName || d.location.networkName,
              cluster: d.location.cluster?.displayName || d.location.clusterName,
              environment: d.location.environment?.displayName || d.location.environmentName,
              clusterAlt: d.location.cluster?.displayName || d.location.clusterName,
              serviceResource: `${d.serviceName} - ${d.resourceName}`,
              unit: d.resource?.unit ?? '',
              quantity: d.value,
              route: d.type === 'New' ? '' : '',
              usageType: d.type === 'Extension' ? '' : '',
              priority: p.priority ?? '',
              category: p.kindName,
              projectName: p.name,
              notes: d.reason ?? '',
            });
          });
        }
      });

      // Sheet 2: Required Parameters (פרמטרים נדרשים למילוי)
      const paramsSheet = workbook.addWorksheet('פרמטרים נדרשים למילוי');
      paramsSheet.views = [{ rightToLeft: true }];
      paramsSheet.columns = [
        { header: 'סוג טכנולוגיה', key: 'tech', width: 24 },
        { header: 'שירות', key: 'service', width: 20 },
        { header: 'שדות נדרשים', key: 'fields', width: 32 },
        { header: 'יחידות מידה', key: 'units', width: 16 },
      ];
      const paramsHeader = paramsSheet.getRow(1);
      paramsHeader.font = { bold: true };
      paramsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };

      const paramData = [
        { tech: 'אחסון', service: 'HDFS', fields: 'Files Amount, Space Quota', units: '-, GB' },
        { tech: 'אחסון', service: 'NAS', fields: 'Storage, Hardware Type', units: 'GB, HDD/SSD' },
        { tech: 'אחסון', service: 'S3', fields: 'Storage, Files Amount', units: 'GB, -' },
        { tech: 'מאגרים', service: 'MongoK', fields: 'Storage', units: 'GB' },
        { tech: 'מאגרים', service: 'Postgres', fields: 'Storage', units: 'GB' },
        { tech: 'מאגרים', service: 'ECK', fields: 'Storage, Elastic Type', units: 'GB, Logs/Text/Geo/Vector' },
        { tech: 'עיבוד', service: 'Openshift', fields: 'Memory, Cores, Pods', units: 'GB, -, -' },
        { tech: 'עיבוד', service: 'Spark', fields: 'CPU, Memory, Storage', units: '-, GB, GB' },
        { tech: 'עיבוד', service: 'VM', fields: 'vCPU, Memory', units: '-, GB' },
        { tech: 'עיבוד', service: 'RUNAI', fields: 'GPU, Memory, CPU', units: '-, GB, -' },
      ];
      paramData.forEach(p => paramsSheet.addRow(p));

      // Sheet 3: Closed Lists (רשימות סגורות)
      const closedSheet = workbook.addWorksheet('רשימות סגורות');
      closedSheet.views = [{ rightToLeft: true }];
      closedSheet.columns = [
        { header: 'שירות', key: 'service', width: 16 },
        { header: 'אתר', key: 'site', width: 16 },
        { header: 'רשת', key: 'network', width: 16 },
        { header: 'סוג משאב', key: 'resourceType', width: 20 },
        { header: 'מרכז', key: 'center', width: 16 },
        { header: 'קטגוריה', key: 'category', width: 20 },
        { header: 'סוג סביבה', key: 'environment', width: 16 },
        { header: 'תעדוף', key: 'priority', width: 12 },
        { header: 'קלאסטר', key: 'cluster', width: 16 },
      ];
      const closedHeader = closedSheet.getRow(1);
      closedHeader.font = { bold: true };
      closedHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };

      const uniqueServices = Array.from(new Set(resources.map(r => r.serviceName)));
      const uniqueBases = Array.from(new Set(locations.map(l => l.base?.displayName || l.baseName)));
      const uniqueNetworks = Array.from(new Set(locations.map(l => l.network?.displayName || l.networkName)));
      const uniqueEnvironments = Array.from(new Set(locations.map(l => l.environment?.displayName || l.environmentName)));
      const uniqueClusters = Array.from(new Set(locations.map(l => l.cluster?.displayName || l.clusterName)));
      const uniqueKinds = kinds.map(k => k.displayName || k.name);
      const priorities = ['1', '2', '3'];

      const maxLen = Math.max(uniqueServices.length, uniqueBases.length, uniqueNetworks.length);
      for (let i = 0; i < maxLen; i++) {
        closedSheet.addRow({
          service: uniqueServices[i] || '',
          site: uniqueBases[i] || '',
          network: uniqueNetworks[i] || '',
          resourceType: resources[i]?.name || '',
          center: 'TBD',
          category: uniqueKinds[i] || '',
          environment: uniqueEnvironments[i] || '',
          priority: priorities[i] || '',
          cluster: uniqueClusters[i] || '',
        });
      }

      // Sheet 4: Hidden Lists (רשימות)
      const listsSheet = workbook.addWorksheet('רשימות');
      listsSheet.views = [{ rightToLeft: true }];
      listsSheet.state = 'hidden';
      listsSheet.columns = [
        { header: 'שירות', key: 'service', width: 16 },
        { header: 'סוג משאב', key: 'resourceType', width: 20 },
        { header: 'יחידת מידה', key: 'unit', width: 14 },
        { header: 'שירות - סוג משאב', key: 'combo', width: 32 },
        { header: '', key: 'empty', width: 2 },
        { header: 'רשת', key: 'network', width: 16 },
        { header: 'מרכז', key: 'center', width: 16 },
        { header: 'קטגוריה', key: 'category', width: 20 },
        { header: 'סוג סביבה', key: 'environment', width: 16 },
        { header: 'תעדוף', key: 'priority', width: 12 },
        { header: 'סוג שימוש', key: 'usageType', width: 16 },
      ];
      const listsHeader = listsSheet.getRow(1);
      listsHeader.font = { bold: true };

      resources.forEach(r => {
        listsSheet.addRow({
          service: r.serviceName,
          resourceType: r.name,
          unit: r.unit,
          combo: `${r.serviceName} - ${r.name}`,
          empty: '',
          network: uniqueNetworks[0] || '',
          center: 'TBD',
          category: uniqueKinds[0] || '',
          environment: uniqueEnvironments[0] || '',
          priority: '1',
          usageType: '',
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="demands-${timestamp}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('excelController.exportProjects error:', error);
      res.status(500).json({ error: 'Failed to export projects' });
    }
  },

  importProjects: async (req: Request, res: Response) => {
    try {
      const user = req.auth!.user;
      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admin role required' });
      }

      const fileBuffer = (req as any).file?.buffer;
      if (!fileBuffer) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      // Detect format: new (Hebrew) or old (English)
      const newFormatSheet = workbook.getWorksheet('טופס איסוף דרישות');
      const oldProjectsSheet = workbook.getWorksheet('Projects');
      const oldDemandsSheet = workbook.getWorksheet('Demands');

      let isNewFormat = false;
      if (newFormatSheet) {
        isNewFormat = true;
      } else if (oldProjectsSheet && oldDemandsSheet) {
        isNewFormat = false;
      } else {
        return res.status(400).json({ error: 'File must contain either "טופס איסוף דרישות" sheet (new format) or both "Projects" and "Demands" sheets (old format)' });
      }

      const [locations, kinds, resources] = await Promise.all([
        prisma.location.findMany({ include: { base: true, environment: true, network: true, cluster: true } }),
        prisma.projectKind.findMany({ select: { name: true } }),
        prisma.resource.findMany(),
      ]);

      const kindNames = new Set(kinds.map((k: any) => k.name));
      const resourceMap = new Map<string, any>();
      resources.forEach(r => resourceMap.set(`${r.serviceName} - ${r.name}`, r));

      const errors: string[] = [];
      const created = { projects: 0, demands: 0, skipped: 0 };

      if (isNewFormat) {
        await importNewFormat(newFormatSheet, locations, kindNames, resourceMap, errors, created, user);
      } else {
        await importOldFormat(oldProjectsSheet, oldDemandsSheet, locations, kindNames, errors, created, user);
      }

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      res.json({ created, errors: errors.length ? errors : undefined });
    } catch (error) {
      console.error('excelController.importProjects error:', error);
      res.status(500).json({ error: 'Failed to import projects' });
    }
  },
};
