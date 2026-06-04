import { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useToast } from './Toast';
import Modal from './Modal';
import Select from './Select';
import SearchableSelect from './SearchableSelect';
import ArrayInput from './ArrayInput';
import api from '../../api/axiosInstance';

export interface EntityColumn {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'boolean' | 'toggle';
    render?: (item: any) => React.ReactNode;
}

export interface EntityField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'searchable-select' | 'array-string';
    options?: { value: any; label: string }[];
    dynamicOptions?: (formData: Record<string, any>) => { value: any; label: string }[];
    required?: boolean;
    disabled?: boolean | ((formData: Record<string, any>) => boolean); // Can be used to disable fields during update if needed or based on other fields
    description?: string;
    onChange?: (value: any, formData: Record<string, any>) => Record<string, any>; // Return partial form data to update
}

interface EntityManagerProps {
    title: string;
    endpoint: string;
    columns: EntityColumn[];
    fields: EntityField[];
    idField?: string | string[]; // Single key or composite key
    transformData?: (data: any) => any; // Transform payload before send
    prepareForEdit?: (item: any) => any; // Transform item before setting form data
    onSuccess?: () => void;
}

export default function EntityManager({
    title,
    endpoint,
    columns,
    fields,
    idField = 'name',
    transformData,
    prepareForEdit,
    onSuccess
}: EntityManagerProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(endpoint);
            setData(response.data);
        } catch (error: any) {
            console.error('Failed to fetch data', error);
            showToast('Failed to load data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [endpoint]);

    const getRowId = (item: any) => {
        if (Array.isArray(idField)) {
            return idField.map(f => item[f]).join('-');
        }
        return item[idField];
    };

    const getApiUrl = (item: any) => {
        if (Array.isArray(idField)) {
            const parts = idField.map(f => item[f]).join('/');
            return `${endpoint}/${parts}`;
        }
        return `${endpoint}/${item[idField]}`;
    };

    const handleCreate = () => {
        setSelectedItem(null);
        // Initialize form data with empty values or defaults
        const initialData: Record<string, any> = {};
        fields.forEach(f => {
            initialData[f.key] = f.type === 'array-string' ? [] : '';
        });
        setFormData(initialData);
        setErrors({});
        setIsModalOpen(true);
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        const dataToSet = prepareForEdit ? prepareForEdit(item) : { ...item };
        setFormData(dataToSet);
        setErrors({});
        setIsModalOpen(true);
    };

    const handleDelete = async (item: any) => {
        const confirmMessage = t('Are you sure you want to delete this item?'); // TODO: Add translation key
        if (window.confirm(confirmMessage)) {
            try {
                await api.delete(getApiUrl(item));
                showToast('Item deleted successfully', 'success');
                fetchData();
                if (onSuccess) onSuccess();
            } catch (error: any) {
                console.error('Delete failed', error);
                showToast(error.response?.data?.error || 'Failed to delete item', 'error');
            }
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        fields.forEach(field => {
            if (field.required) {
                const val = formData[field.key];
                const isDisabled = typeof field.disabled === 'function' ? field.disabled(formData) : field.disabled;

                // Skip validation if field is disabled? Usually yes for dependent fields that are effectively hidden/locked.
                // But let's check basic requirement: if it's required and NOT disabled, enforce it.
                if (!isDisabled) {
                    if (field.type === 'array-string') {
                        if (!val || val.length === 0) {
                            newErrors[field.key] = t('This field is required');
                            isValid = false;
                        }
                    } else if (!val && val !== 0) {
                        newErrors[field.key] = t('This field is required');
                        isValid = false;
                    }
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const payload = transformData ? transformData(formData) : formData;

            // Clean payload to match fields types
            fields.forEach(field => {
                if (field.type === 'number' && typeof payload[field.key] === 'string') {
                    payload[field.key] = parseFloat(payload[field.key]);
                }
            });

            if (selectedItem) {
                await api.put(getApiUrl(selectedItem), payload);
                showToast('Item updated successfully', 'success');
            } else {
                await api.post(endpoint, payload);
                showToast('Item created successfully', 'success');
            }
            setIsModalOpen(false);
            fetchData();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('Submit failed', error);
            showToast(error.response?.data?.error || 'Operation failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredData = data.filter(item => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        // Search across all columns
        return columns.some(col => {
            const val = item[col.key];
            return val && String(val).toLowerCase().includes(searchLower);
        });
    });

    const isFieldDisabled = (field: EntityField) => {
        if (typeof field.disabled === 'function') {
            return field.disabled(formData);
        }
        if (field.disabled) return true;
        // If editing, disable primary key fields (simple assumption for now)
        if (selectedItem) {
            if (Array.isArray(idField) && idField.includes(field.key)) return true;
            if (typeof idField === 'string' && idField === field.key) return true;
        }
        return false;
    };

    const handleFieldChange = (field: EntityField, value: any) => {
        if (field.onChange) {
            const updates = field.onChange(value, formData);
            setFormData({ ...formData, ...updates, [field.key]: value });
        } else {
            setFormData({ ...formData, [field.key]: value });
        }
    };

    const handleToggle = async (item: any, key: string, currentValue: boolean) => {
        const rowId = getRowId(item);

        // Prevent double-click
        if (togglingIds.has(rowId)) return;

        // Mark as toggling
        setTogglingIds(prev => new Set(prev).add(rowId));

        // Optimistic update - immediately update the UI
        setData(prevData =>
            prevData.map(d =>
                getRowId(d) === rowId ? { ...d, [key]: !currentValue } : d
            )
        );

        try {
            await api.put(getApiUrl(item), { [key]: !currentValue });
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('Toggle failed', error);
            // Revert on error
            setData(prevData =>
                prevData.map(d =>
                    getRowId(d) === rowId ? { ...d, [key]: currentValue } : d
                )
            );
            showToast(error.response?.data?.error || 'Operation failed', 'error');
        } finally {
            setTogglingIds(prev => {
                const next = new Set(prev);
                next.delete(rowId);
                return next;
            });
        }
    };

    const renderToggle = (item: any, columnKey: string) => {
        const isActive = item[columnKey];
        const rowId = getRowId(item);
        const isToggling = togglingIds.has(rowId);

        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(item, columnKey, isActive);
                }}
                disabled={isToggling}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isActive ? 'bg-green-500' : 'bg-gray-300'
                } ${isToggling ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                role="switch"
                aria-checked={isActive}
                dir="ltr"
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
        );
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-text-primary m-0">{title}</h3>
                    <div className="relative">
                        <MdSearch size={20} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input
                            type="text"
                            placeholder={t('common.search', 'Search...')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-bg-paper text-sm ps-10 pe-4 py-2 rounded-xl border border-divider outline-none focus:border-primary transition-colors w-64"
                        />
                    </div>
                </div>

                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-text-primary text-bg-paper rounded-xl hover:bg-black transition-colors border-none cursor-pointer font-medium"
                >
                    <MdAdd size={20} />
                    {t('common.add', 'Add')}
                </button>
            </div>

            <div className="bg-bg-paper rounded-xl shadow-sm border border-divider overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-start">
                        <thead className="text-xs text-text-secondary uppercase bg-gray-50 border-b border-divider">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} className="px-6 py-3 font-semibold whitespace-nowrap text-start">
                                        {col.label}
                                    </th>
                                ))}
                                <th className="px-6 py-3 font-semibold text-center w-[100px]">{t('common.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-divider">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-text-secondary">
                                        {t('common.noResults', 'No results found')}
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, idx) => (
                                    <tr key={getRowId(item) || idx} className="bg-white hover:bg-gray-50 transition-colors">
                                        {columns.map(col => (
                                            <td key={col.key} className="px-6 py-4 text-text-primary whitespace-nowrap text-start">
                                                {col.type === 'toggle'
                                                    ? renderToggle(item, col.key)
                                                    : col.render
                                                        ? col.render(item)
                                                        : item[col.key]}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                                                >
                                                    <MdEdit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer"
                                                >
                                                    <MdDelete size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedItem ? t('common.edit', 'Edit') : t('common.add', 'Add')}
            >
                <div className="flex flex-col gap-4">
                    {fields.map(field => {
                        const fieldOptions = field.dynamicOptions ? field.dynamicOptions(formData) : field.options;
                        const isDisabled = isFieldDisabled(field);

                        return (
                            <div key={field.key} className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-text-secondary">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>

                                {field.type === 'select' && fieldOptions ? (
                                    <Select
                                        options={fieldOptions}
                                        value={formData[field.key] || ''}
                                        onChange={val => handleFieldChange(field, val)}
                                        placeholder={t('common.select', 'Select...')}
                                        disabled={isDisabled}
                                    />
                                ) : field.type === 'searchable-select' && fieldOptions ? (
                                    <SearchableSelect
                                        options={fieldOptions}
                                        value={formData[field.key] || ''}
                                        onChange={val => handleFieldChange(field, val)}
                                        placeholder={t('common.select', 'Select...')}
                                        disabled={isDisabled}
                                    />
                                ) : field.type === 'array-string' ? (
                                    <ArrayInput
                                        value={formData[field.key] || []}
                                        onChange={val => handleFieldChange(field, val)}
                                        placeholder={t('common.typeAndEnter', 'Type and press Enter...')}
                                        disabled={isDisabled}
                                    />
                                ) : (
                                    <input
                                        type={field.type}
                                        value={formData[field.key] || ''}
                                        onChange={e => handleFieldChange(field, e.target.value)}
                                        disabled={isDisabled}
                                        className={`px-4 py-2 border rounded-xl outline-none focus:border-primary transition-colors ${errors[field.key] ? 'border-red-500' : 'border-divider'
                                            } ${isDisabled ? 'bg-gray-100 text-text-secondary' : 'bg-bg-paper text-text-primary'
                                            }`}
                                    />
                                )}


                                {errors[field.key] && (
                                    <span className="text-xs text-red-500">{errors[field.key]}</span>
                                )}
                                {field.description && (
                                    <span className="text-xs text-text-secondary">{field.description}</span>
                                )}
                            </div>
                        )
                    })}

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-text-secondary hover:bg-gray-100 rounded-xl transition-colors border-none cursor-pointer bg-transparent"
                            disabled={isSubmitting}
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            className={`px-4 py-2 bg-text-primary text-bg-paper rounded-xl hover:bg-black transition-colors border-none cursor-pointer font-medium ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
