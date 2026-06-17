export interface SubDecisionOption {
  value: string;
  label: string;
  status: 'Approved' | 'Rejected' | 'AwaitingProcurement' | 'HeldForEfficiency' | 'ConditionalFootprintReduction' | 'PartiallyApproved' | 'InProgress' | 'TransferredTo810';
  requiresReason: boolean;
  requiresQuantity: boolean;
  requiresDate: boolean;
  requiresUser: boolean;
}

export const SUB_DECISIONS: SubDecisionOption[] = [
  { value: 'approve', label: 'אישור', status: 'Approved', requiresReason: false, requiresQuantity: false, requiresDate: false, requiresUser: false },
  { value: 'reject', label: 'דחייה', status: 'Rejected', requiresReason: true, requiresQuantity: false, requiresDate: false, requiresUser: false },
  { value: 'procurement', label: 'רכש', status: 'AwaitingProcurement', requiresReason: false, requiresQuantity: false, requiresDate: true, requiresUser: false },
  { value: 'efficiency', label: 'מושהה – תלוי בהתייעלות', status: 'HeldForEfficiency', requiresReason: true, requiresQuantity: false, requiresDate: false, requiresUser: false },
  { value: 'footprint', label: 'מאושר בתנאי הורדת רגל', status: 'ConditionalFootprintReduction', requiresReason: true, requiresQuantity: false, requiresDate: false, requiresUser: false },
  { value: 'partial', label: 'כמות חלקית', status: 'PartiallyApproved', requiresReason: false, requiresQuantity: true, requiresDate: false, requiresUser: false },
  { value: 'commander', label: 'מחכה להתייחסות מפקד', status: 'InProgress', requiresReason: true, requiresQuantity: false, requiresDate: false, requiresUser: true },
  { value: 'transfer810', label: 'בתהליך – הועבר ל-810', status: 'TransferredTo810', requiresReason: true, requiresQuantity: false, requiresDate: false, requiresUser: false },
  { value: 'dcInstall', label: 'מחכה להתקנה ב-DC', status: 'InProgress', requiresReason: true, requiresQuantity: false, requiresDate: true, requiresUser: false },
  { value: 'budget', label: 'מחכה לשורת תקציב', status: 'InProgress', requiresReason: true, requiresQuantity: false, requiresDate: false, requiresUser: true },
];
