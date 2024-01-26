require('dotenv').config();
const axios = require('axios');

// GitHub API endpoint for pull requests
const githubApiUrl = 'https://api.github.com/repos/:owner/:repo/pulls';

// GitHub repository information
const owner = process.env.OWNER;
const repo = process.env.REPO;

// GitHub personal access token with repo scope
const githubToken = process.env.GITHUB_TOKEN;

const params = {
  state: 'open',
  sort: 'created',
  direction: 'desc',
};

const githubHeaders = {
  Authorization: `Bearer ${githubToken}`,
  Accept: 'application/vnd.github.v3+json',
};
async function getPullRequests() {
    const unapprovedPrs = [];
    try {
      const response = await axios.get(githubApiUrl.replace(':owner', owner).replace(':repo', repo), { params, headers: githubHeaders });
  
      if (response.status === 200) {
        const pullRequests = response.data;
        if (pullRequests.length > 0) {
          for (const pr of pullRequests) {
            const reviewsUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/reviews`;
            const reviewsResponse = await axios.get(reviewsUrl, { headers: githubHeaders });
            if (reviewsResponse.status === 200) {
              const reviews = reviewsResponse.data;
              const approvedReviews = reviews.filter(review => review.state === 'APPROVED');
              const numberOfApprovals = approvedReviews.length;
               if (numberOfApprovals < 2 && !pr.draft){
                unapprovedPrs.push({
                    url: pr.url,
                    id: pr.id,
                    number: pr.number,
                    title: pr.title,
                    user: {
                        login: pr.user.login,
                        id: pr.user.id,
                    },
                    created_at: pr.created_at,
                    labels: pr.labels,
                    numberOfApprovals
                });
              }
            } else {
              console.error(`Failed to fetch reviews for Pull Request ${pr.number}.`);
            }
          }
        } else {
          console.log('No pull requests found.');
        }
      } else {
        console.error(`Failed to fetch pull requests from GitHub. Error: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`An error occurred: ${error.message}`);
    }
    return unapprovedPrs;
}
  
const createSlackMessage = async () => {
    const unapprovedPrs = await getPullRequests();
    let text = `🚀 *Pull Request Review Needed* 🚀\n\nHello Team,\n\nWe have pull requests that requires your attention:`
    unapprovedPrs.forEach(pr => {
            text += `\n\n🔗 *Pull Request URL*: <${pr.url}|Pull Request #${pr.number}>\n📖 *Pull Request Title*: ${pr.title}\n\n👀* Pull Request created at: ${pr.created_at}\n\n📌 * Current Number of Approvals*: ${pr.numberOfApprovals}\n\n📌`
        }
    )
    text += `\n\n👀 This pull request is currently awaiting reviews. We need at least two approvals before it can be merged.\n\n📌 *Action Required*:\n1. Please take a moment to review the changes in the pull request.\n2. If you find the changes satisfactory, consider providing your approval.\n\nLet's work together to keep our codebase healthy and ensure the timely progress of our project.\n\nThank you for your collaboration!\n\nHappy Coding!`
    console.log(text)
}
createSlackMessage()