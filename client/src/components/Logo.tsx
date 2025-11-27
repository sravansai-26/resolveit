import { Building2 } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <Building2 size={32} className="text-blue-600" />
      <span className="text-2xl font-bold text-blue-600">Resolveit</span>
    </div>
  );
}