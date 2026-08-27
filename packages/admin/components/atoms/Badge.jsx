const VARIANT_STYLES = {
  default: "bg-gray-100 text-gray-800",
  primary: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  outline: "bg-transparent text-gray-700 border border-gray-300",
};

const SIZE_STYLES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-0.5",
  lg: "text-base px-3 py-1",
};

export const Badge = ({
  variant = "default",
  size = "md",
  value,
  className = "",
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
    >
      {value}
    </span>
  );
}
