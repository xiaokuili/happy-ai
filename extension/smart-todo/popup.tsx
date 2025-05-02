import "./style.css"
import { useState, useEffect } from "react"
import { getYCProjects } from "./storage"
import type { YCProject } from "./utils/types"

function IndexPopup() {
    const [projects, setProjects] = useState<YCProject[]>([]);

    useEffect(() => {
        const loadProjects = async () => {
            const storedProjects = await getYCProjects()
            console.log("storedProjects", storedProjects)
            setProjects(storedProjects)
        }
        loadProjects()
    }, [])

    return (
        <div className="p-4 bg-white w-[800px]">
            <div className="overflow-x-auto">
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[20%]">
                                    项目名称
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[15%]">
                                    当前阶段
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[25%]">
                                    关键指标
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[40%]">
                                    当前行动
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {projects.map((project) => (
                                <tr key={project.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {project.name}
                                    </td>

                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {project.events?.[0]?.metric?.[0]?.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {project.events?.[0]?.title}
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

export default IndexPopup