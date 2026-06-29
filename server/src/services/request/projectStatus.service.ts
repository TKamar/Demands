import prisma from '../../lib/prisma';
import { notificationService } from '../notification/notification.service';

const TERMINAL_APPROVED = ['Approved', 'PartiallyApproved', 'ApprovedWithCondition',
  'AwaitingProcurement', 'HeldForEfficiency', 'ConditionalFootprintReduction',
  'InProgress', 'TransferredTo810'];
const TERMINAL_NEGATIVE = ['Rejected', 'Cancelled', 'CenterManagerRejected'];
const TERMINAL_ALL = [...TERMINAL_APPROVED, ...TERMINAL_NEGATIVE];

export async function syncProjectStatus(projectName: string, actorUsername: string): Promise<void> {
  const demands = await prisma.demand.findMany({
    where: { projectName },
    select: { status: true },
  });
  if (demands.length === 0) return;

  const allTerminal = demands.every(d => TERMINAL_ALL.includes(d.status));
  if (!allTerminal) return;

  const hasNegative = demands.some(d => TERMINAL_NEGATIVE.includes(d.status));
  const newStatus = hasNegative ? 'PendingAdminReview' : 'FullyApproved';

  await prisma.project.update({
    where: { name: projectName },
    data: { projectStatus: newStatus as any },
  });

  if (newStatus === 'PendingAdminReview') {
    setImmediate(() => {
      notificationService.createAdminBroadcast({
        type: 'ProjectNeedsAdminReview' as any,
        title: 'פרויקט ממתין לבדיקת מנהל',
        message: `פרויקט "${projectName}" קיבל תוצאות מעורבות ומצריך בדיקה.`,
        projectName,
      }).catch(() => {});
    });
  }
}
