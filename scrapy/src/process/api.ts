const translate = async (text: string) => {
    const response = await fetch('http://localhost:8000/translate', {
        method: 'POST',
        body: JSON.stringify({text})
    })
    const data = await response.json()
    return data['translation']
 }

const updateArticle = async (article: any) => {
    const response = await fetch(`${process.env.TRAVEL_API_URL}/api/journal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...article,
            apiKey: process.env.TRAVEL_API_KEY
        })
    })
    
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update article')
    }
    
    return response.json()
}

export { translate, updateArticle };