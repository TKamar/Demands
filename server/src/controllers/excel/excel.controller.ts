import { Request, Response } from 'express';
import * as ExcelJS from 'exceljs';
import multer from 'multer';
import prisma from '../../lib/prisma';
import { DemandStatus, DemandType, ProjectType, Median, Priority } from '@prisma/client';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
            include: { location: true },
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { demands: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Demands System';
      workbook.created = new Date();

      // Sheet 1: Projects
      const pSheet = workbook.addWorksheet('Projects');
      pSheet.columns = [
        { header: 'שם פרויקט', key: 'name', width: 32 },
        { header: 'מטרה', key: 'purpose', width: 42 },
        { header: 'קשור ל', key: 'relatedTo', width: 22 },
        { header: 'סוג', key: 'type', width: 14 },
        { header: 'קטגוריה', key: 'kind', width: 22 },
        { header: 'שנה', key: 'year', width: 8 },
        { header: 'חצי', key: 'median', width: 8 },
        { header: 'עדיפות', key: 'priority', width: 10 },
        { header: 'מרכז', key: 'centerName', width: 22 },
        { header: 'ענף', key: 'branchName', width: 22 },
        { header: 'מחלקה', key: 'sectionName', width: 22 },
        { header: 'בסיס', key: 'base', width: 16 },
        { header: 'סביבה', key: 'environment', width: 16 },
        { header: 'רשת', key: 'network', width: 16 },
        { header: 'אשכול', key: 'cluster', width: 16 },
        { header: 'נוצר ע"י', key: 'createdBy', width: 22 },
        { header: 'תאריך יצירה', key: 'createdAt', width: 18 },
        { header: 'מספר דרישות', key: 'demandCount', width: 14 },
      ];

      const headerRow = pSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FF1A237E' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
      headerRow.alignment = { horizontal: 'right' };

      projects.forEach((p: any) => {
        pSheet.addRow({
          name: p.name,
          purpose: p.purpose,
          relatedTo: p.relatedTo ?? '',
          type: p.type,
          kind: p.kindName,
          year: p.year ?? '',
          median: p.median ?? '',
          priority: p.priority ?? '',
          centerName: p.centerName,
          branchName: p.branchName,
          sectionName: p.sectionName,
          base: p.location.baseName,
          environment: p.location.environmentName,
          network: p.location.networkName,
          cluster: p.location.clusterName,
          createdBy: p.createdByName ?? p.createdBy ?? '',
          createdAt: new Date(p.createdAt).toLocaleDateString('he-IL'),
          demandCount: p._count.demands,
        });
      });

      // Sheet 2: Demands
      const dSheet = workbook.addWorksheet('Demands');
      dSheet.columns = [
        { header: 'שם פרויקט (FK)', key: 'projectName', width: 32 },
        { header: 'שירות', key: 'serviceName', width: 18 },
        { header: 'שירות משאב', key: 'resourceService', width: 18 },
        { header: 'משאב', key: 'resourceName', width: 18 },
        { header: 'ערך', key: 'value', width: 10 },
        { header: 'יחידה', key: 'unit', width: 10 },
        { header: 'סוג', key: 'type', width: 12 },
        { header: 'סטטוס', key: 'status', width: 24 },
        { header: 'מרכז', key: 'centerName', width: 22 },
        { header: 'ענף', key: 'branchName', width: 22 },
        { header: 'מחלקה', key: 'sectionName', width: 22 },
        { header: 'בסיס', key: 'base', width: 16 },
        { header: 'סביבה', key: 'environment', width: 16 },
        { header: 'רשת', key: 'network', width: 16 },
        { header: 'אשכול', key: 'cluster', width: 16 },
        { header: 'ערך מאושר', key: 'approvedValue', width: 14 },
        { header: 'ערך משוייך', key: 'assignedValue', width: 14 },
        { header: 'סיבה', key: 'reason', width: 32 },
        { header: 'נוצר ע"י', key: 'createdBy', width: 22 },
        { header: 'תאריך יצירה', key: 'createdAt', width: 18 },
      ];

      const dHeaderRow = dSheet.getRow(1);
      dHeaderRow.font = { bold: true, color: { argb: 'FF1B5E20' } };
      dHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      dHeaderRow.alignment = { horizontal: 'right' };

      projects.forEach((p: any) => {
        p.demands.forEach((d: any) => {
          dSheet.addRow({
            projectName: d.projectName,
            serviceName: d.serviceName,
            resourceService: d.resourceService,
            resourceName: d.resourceName,
            value: d.value,
            unit: '',
            type: d.type,
            status: d.status,
            centerName: d.centerName,
            branchName: d.branchName,
            sectionName: d.sectionName,
            base: d.location.baseName,
            environment: d.location.environmentName,
            network: d.location.networkName,
            cluster: d.location.clusterName,
            approvedValue: d.approvedValue ?? '',
            assignedValue: d.assignedValue ?? '',
            reason: d.reason ?? '',
            createdBy: d.createdByName ?? d.createdBy ?? '',
            createdAt: new Date(d.createdAt).toLocaleDateString('he-IL'),
          });
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="projects-${timestamp}.xlsx"`);

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

      const pSheet = workbook.getWorksheet('Projects');
      const dSheet = workbook.getWorksheet('Demands');

      if (!pSheet || !dSheet) {
        return res.status(400).json({ error: 'File must contain "Projects" and "Demands" sheets' });
      }

      const errors: string[] = [];
      const created = { projects: 0, demands: 0, skipped: 0 };

      const [locations, kinds] = await Promise.all([
        prisma.location.findMany({ include: { base: true, environment: true, network: true, cluster: true } }),
        prisma.projectKind.findMany({ select: { name: true } }),
      ]);

      const kindNames = new Set(kinds.map((k: any) => k.name));

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

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

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

      res.json({ created, errors: errors.length ? errors : undefined });
    } catch (error) {
      console.error('excelController.importProjects error:', error);
      res.status(500).json({ error: 'Failed to import projects' });
    }
  },
};
