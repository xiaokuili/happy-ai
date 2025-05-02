import { Storage } from "@plasmohq/storage"
import type { YCProject, TodoEvent } from "./utils/types"


const ycProject: YCProject[] = [
    {
        id: "1",
        name: "YC教练",
        type: "",
        events: [
            {
                id: "1",
                title: "实现agent, 推荐下一步行动以及指标",
                metric: [
                    {
                        id: "1",
                        name: "",
                        value: 100
                    }
                ]
            }
        ]
    },
    {
        id: "2",
        name: "Travel to Chain",
        events: [
            {
                id: "1",
                title: "基于reddit制作免费旅游攻略",
            }
        ]
    }
]

const initYCProjects = async () => {
    const storage = new Storage()
    // storage.clear()
    await storage.set("yc_projects", JSON.stringify(ycProject))

    return ycProject
}

const getYCProjects = async (): Promise<YCProject[]> => {
    const storage = new Storage()
    const projects = await storage.get("yc_projects")
    if (!projects) {
        return await initYCProjects()
    }
    console.log("projects", projects)
    return JSON.parse(projects) as YCProject[]
}

const addEventToYCProject = async (projectId: string, event: TodoEvent) => {
    const storage = new Storage()
    const projectsJson = await storage.get("yc_projects")
    if (!projectsJson) {
        await initYCProjects()
        return addEventToYCProject(projectId, event)
    }

    const parsedProjects = JSON.parse(projectsJson) as YCProject[]
    const project = parsedProjects.find((p) => p.id === projectId)

    if (!project) {
        throw new Error(`Project with ID ${projectId} not found`)
    }

    if (!project.events) {
        project.events = []
    }

    project.events.push(event)
    await storage.set("yc_projects", JSON.stringify(parsedProjects))
    return project
}


export {
    getYCProjects,
    addEventToYCProject,
}
