import "./style.css"
import { useState, useEffect } from "react"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

function IndexPopup() {
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const loadProjects = async () => {
            const storedProjects = await storage.get("projects")
            if (!storedProjects) {
                const defaultProjects = [
                    {
                        id: '1',
                        name: 'YC教练',
                        stage: 'MVP',
                        metric: '23/100 周活跃用户',
                        action: '完成MVP开发,收集用户反馈',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: '2',
                        name: 'AI助手工具',
                        stage: '市场调研',
                        metric: '15/50 问卷回收',
                        action: '完成竞品分析报告',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: '3',
                        name: '数据分析平台',
                        stage: '原型设计',
                        metric: '8/10 功能完成度',
                        action: '完成核心流程设计',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ]
                await storage.set("projects", defaultProjects)
                setProjects(defaultProjects)
            }
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
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            {project.stage}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {project.metric}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {project.action}
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