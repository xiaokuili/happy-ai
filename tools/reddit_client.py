import requests

client_id = "6V7jNV8pdmR4ENhvKEucqw"
client_secret = "dqaTnAjMBmjj5Sp6HMSQiss8lbNoFg"
user_agent = "python:likes:v1.0 (by /u/Individual_Pool1401)"
subreddit = "r/travelchina"

"""REDDIT API"""


class RedditClient:
    def __init__(self, client_id, client_secret, user_agent):
        self.client_id = client_id
        self.client_secret = client_secret
        self.user_agent = user_agent
        self.base_url = "https://www.reddit.com"
        self.api_url = "https://oauth.reddit.com"
        self.access_token = None

    def get_access_token(self):
        """获取访问令牌"""
        auth = requests.auth.HTTPBasicAuth(self.client_id, self.client_secret)
        data = {
            'grant_type': 'client_credentials'
        }
        headers = {
            'User-Agent': self.user_agent
        }
        response = requests.post(
            f"{self.base_url}/api/v1/access_token",
            auth=auth,
            data=data,
            headers=headers
        )
        self.access_token = response.json()['access_token']

    def get_subreddit_posts(self, subreddit, limit=50, sort='hot'):
        """获取指定subreddit的帖子
        
        Args:
            subreddit: subreddit名称
            limit: 获取的帖子数量
            sort: 排序方式 (hot, new, top, rising)
        """
        if not self.access_token:
            self.get_access_token()

        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'User-Agent': self.user_agent
        }

        response = requests.get(
            f"{self.api_url}/r/{subreddit}/{sort}",
            headers=headers,
            params={'limit': limit}
        )

        if response.status_code == 200:
            return response.json()['data']['children']
        else:
            raise Exception(f"获取帖子失败: {response.status_code}")
        
    def save_posts_to_file(self, posts, filename):
        """将帖子保存到文件"""
        with open(filename, 'w') as f:
            for post in posts:
                f.write(f"{post['data']['title']}\n")

if __name__ == "__main__":
    reddit_client = RedditClient(client_id, client_secret, user_agent)
    posts = reddit_client.get_subreddit_posts(subreddit)
    reddit_client.save_posts_to_file(posts, "posts.txt")
    for post in posts:
        print(post['data']['title'])
