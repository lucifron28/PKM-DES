import type { CourseOfferingSeed } from "@/lib/constants/course-offerings";
import type { SubjectSeed } from "@/lib/constants/subjects";

type SubjectReferenceRow = Pick<CourseOfferingSeed | SubjectSeed, "course_code" | "course_description" | "units">;

export function SubjectReferenceTable({ rows, codeLabel }: { rows: SubjectReferenceRow[]; codeLabel: string }) {
  return (
    <div>
      <p className="print-hidden mb-2 text-xs text-slateui-muted sm:hidden">
        Swipe horizontally to view complete subject details.
      </p>
      <div className="overflow-hidden rounded-md border border-slateui-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] table-fixed text-left text-sm">
          <thead className="bg-primary-800 text-white">
            <tr>
              <th scope="col" className="w-28 px-3 py-3 font-semibold sm:px-4">
                {codeLabel}
              </th>
              <th scope="col" className="px-3 py-3 font-semibold sm:px-4">
                Description
              </th>
              <th scope="col" className="w-16 px-3 py-3 text-right font-semibold sm:px-4">
                Units
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slateui-border">
            {rows.map((row) => (
              <tr key={`${row.course_code}-${row.course_description}`}>
                <td className="px-3 py-3 align-top font-semibold text-slateui-text sm:px-4">{row.course_code}</td>
                <td className="break-words px-3 py-3 align-top leading-6 text-slateui-secondary sm:px-4">
                  {row.course_description}
                </td>
                <td className="px-3 py-3 text-right align-top font-semibold tabular-nums text-slateui-text sm:px-4">
                  {row.units}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
