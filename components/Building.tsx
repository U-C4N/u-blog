import { Building as BuildingType } from '@/lib/supabase/config'
import Link from 'next/link'

interface BuildingProps {
  building: BuildingType
  onEdit?: (id: string, data: Partial<BuildingType>) => void
  onDelete?: (id: string) => void
  isEditable?: boolean
}

export default function Building({ building, onEdit, onDelete, isEditable = false }: BuildingProps) {
  return (
    <div className="p-4 border rounded-lg hover:border-primary transition-colors">
      <h3 className="font-semibold text-lg">{building.title}</h3>
      <p className="text-muted-foreground mt-1">{building.description}</p>
      {building.external ? (
        <Link href={building.url || '#'} target="_blank" className="text-primary hover:underline mt-2 inline-block">
          Visit →
        </Link>
      ) : (
        <Link href={`/buildings/${building.id}`} className="text-primary hover:underline mt-2 inline-block">
          Enter →
        </Link>
      )}
      {isEditable && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => onEdit?.(building.id, { title: prompt('New title:', building.title) || building.title })}>
            Edit
          </button>
          <button onClick={() => onDelete?.(building.id)}>Delete</button>
        </div>
      )}
    </div>
  )
} 