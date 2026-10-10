# Reddit API use

Every endpoint the app calls, and why. All API calls go to
`https://oauth.reddit.com` with a bearer token and `raw_json=1`; sign-in and
tokens go to `https://www.reddit.com`. Functions are in `src/api/endpoints.ts`
and `src/api/oauth.ts`. Add a line here for each new endpoint.

## Sign-in and tokens

| Request                                                                                          | Used for                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/authorize.compact` (www)                                                            | Reddit's sign-in page, in Safari's sign-in sheet: `response_type=code`, `duration=permanent`, `redirect_uri=perch://oauth/callback`, `scope=identity read mysubreddits history save` |
| `POST /api/v1/access_token` (www), `grant_type=authorization_code`                               | The code from the redirect, for a refresh token                                                                                                                                      |
| `POST /api/v1/access_token` (www), `grant_type=refresh_token`                                    | An access token, about hourly                                                                                                                                                        |
| `POST /api/v1/access_token` (www), `grant_type=https://oauth.reddit.com/grants/installed_client` | Anonymous mode's access token, with the phone's device ID                                                                                                                            |
| `POST /api/v1/revoke_token` (www)                                                                | Signing out                                                                                                                                                                          |

## Reading

| Request                                               | Scope        | Used for                                       |
| ----------------------------------------------------- | ------------ | ---------------------------------------------- |
| `GET /api/v1/me`                                      | identity     | The signed-in account's name, after signing in |
| `GET /best`, `/hot`, `/new`, `/top`, `/rising`        | read         | Home                                           |
| `GET /r/popular/{sort}?geo_filter=GLOBAL`             | read         | Popular                                        |
| `GET /r/{name}/{sort}`                                | read         | A subreddit's posts                            |
| `GET /r/{name}/about`                                 | read         | A subreddit's header                           |
| `GET /comments/{id}` and `/comments/{id}/_/{comment}` | read         | A post and its comments, or one thread         |
| `GET /api/morechildren`                               | read         | Comments behind "load more"                    |
| `GET /subreddits/search`                              | read         | Browse's search                                |
| `GET /subreddits/mine/subscriber`                     | mysubreddits | Browse's subscriptions                         |
| `GET /user/{name}/saved?type=links\|comments`         | history      | The Saved tab                                  |

Feeds ask for 50 posts a page, subscriptions and saved items for 100.

## Writing

| Request                              | Scope | Used for                           |
| ------------------------------------ | ----- | ---------------------------------- |
| `POST /api/save`, `POST /api/unsave` | save  | The bookmark on posts and comments |

Nothing else is ever written: no votes, comments, posts or messages.
