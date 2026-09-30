const VARIANT = {
  default: 'border-gray-200 bg-white text-gray-700',
  primary: 'border-primary-green bg-primary-green text-white',
  success: 'border-green-200 bg-green-50 text-green-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
};

// maps appointment status -> which VARIANT to use
const statusVariant = {
  pending: 'warning',
  confirmed: 'primary',
  published: 'primary',
  cancelled: 'danger',
  completed: 'success',
};

const SIZE = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

const Badge = ({ value, variant, size = 'md', className = '' }) => {
  const resolvedVariant = variant ?? statusVariant[value] ?? 'default';

  const variantClasses = VARIANT[resolvedVariant] ?? VARIANT.default;
  const sizeClasses = SIZE[size] ?? SIZE.md;

  return (
    <div
      className={`inline-flex w-full items-center justify-center rounded-full border text-center font-medium shadow-sm ${variantClasses} ${sizeClasses} ${className}`}
    >
      {value}
    </div>
  );
};

export default Badge;

