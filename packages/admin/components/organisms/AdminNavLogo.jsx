export function Logo({ panel }) {
  return (
    <div className="flex h-10 items-center">
      {panel ? (
        <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" />
      ) : (
        <img
          src="/favicon.ico"
          alt="Logo"
          className="h-7 w-7 rounded-md object-contain"
        />
      )}
    </div>
  );
}
