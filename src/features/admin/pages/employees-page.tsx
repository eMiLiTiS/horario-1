export function EmployeesPage({ readOnly }: { readOnly?: boolean }) {
  return <div><h1 className="text-xl font-semibold">Empleados</h1>{readOnly && <p className="text-xs text-muted-foreground">Vista solo lectura</p>}</div>
}
