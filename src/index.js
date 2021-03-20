/**
 * Fetch json data from given url
 * @param { String } url
 * @return { Promise }
 */
function getJsonData(url) {
    return fetch(url)
    .then((res) => {
        if (!res.ok) return Promise.reject(new Error(res.status));
        return res.json();
    });
}

/**
 * Send custom request using fetch api
 * @param { String } url
 * @param { String } method
 * @param { Object } body
 * @return { Promise }
 */
function ajax(url, method, body) {
    const formData = new FormData();
    Object.keys(body).forEach(key => formData.append(key, body[key]));

    return new Promise((resolve, reject) => {
        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData)
        })
        .then((res) => {
            if (!res.ok) return res.text().then(msg => reject(msg));
            return resolve();
        })
        .catch(reject);
    });
}

/**
 * Format slug to fetch comments json file
 * @param { String } slug
 * @return { String }
 */
function cleanSlug(slug) {
    return slug.toLowerCase().replace(/^\/|\/$/g, '').replace(/\//g, '_').trim();
}

class Jamments {
    /**
     * Create the API object
     * @param { Object } options The options object
     * @param { String } options.endpoint The API's full address (ex. https://comments.my-blog.net)
     * @param { String } options.cachedFilesURI URI path to get to static files (without slashes, ex. static)
     */
    constructor(config) {
        if (!config || !config.endpoint || !config.cachedFilesURI) throw new TypeError('Both endpoint and cachedFilesURI must be defined');

        this.endpoint = config.endpoint;
        this.cachedFilesURI = config.cachedFilesURI;
        this.commentsHash = {};
    }

    /**
     * Escape html to avoid xss
     * @param { String } text
     * @return { String }
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Create HTML from Markdown (just a subset: links, *italicized*, **bold**, `code`, ```codeblock``` and paragraph)
     * @param { String } text
     * @return { String }
     */
    static parseMd(text) {
        const codeblock = /```([^]+?.*?[^]+?[^]+?)```/g;
        const code = /`(.*?)`/g;
        const link = /\[(.*?)\]\((.*?)\)/g;
        const ital = /\*(.*?)\*/g;
        const bold = /\*\*(.*?)\*\*/g;
        const paragraph = /(.+((\r?\n.+)*))/g;

        return text.replace(codeblock, '<pre><code class="hljs">$1</code></pre>')
        .replace(code, '<code>$1</code>')
        .replace(link, '<a href="$2">$1</a>')
        .replace(ital, '<i>$1</i>')
        .replace(bold, '<strong>$1</strong>')
        .replace(paragraph, '<p>$1</p>');
    }

    /**
     * Get global site info (nbr of comments for each article & md5 of admin user)
     * @return { Promise }
     */
    getSiteInfos() {
        return getJsonData(`${this.endpoint}/${this.cachedFilesURI}/site.json`);
    }

    /**
     * Return all comments sorted chronogically. Children comments are contained inside their parents (chrono sorted too)
     * @param { String } slug
     * @return { Promise }
     * @return { Promise.resolve<Array> } array of comments sorted chronologically
     * @return { Promise.reject<Error> }
     */
    getComments(slug) {
        return getJsonData(`${this.endpoint}/${this.cachedFilesURI}/${cleanSlug(slug)}.json`)
        .then((comments) => {
            comments.sort((a, b) => {
                if (new Date(a.submitted_at) < new Date(b.submitted_at)) return -1;
                return 1;
            });

            // create hash object
            comments.forEach((comment) => {
                this.commentsHash[comment.id] = Object.assign(comment, { children: [] });
            });

            // move children into their parents object
            comments.forEach((comment) => {
                if (!comment.parent_id) return;
                this.commentsHash[comment.parent_id].children.push(comment);
            });

            // filter out children, each comment now contains all its children (object are passed by ref 😉)
            return comments.reduce((acc, curr) => {
                if (!curr.parent_id) acc.push(curr);
                return acc;
            }, []);
        });
    }

    /**
     * Get a comment from cached comments
     * @param { String } id
     * @return { Object }
     */
    getCommentById(id) {
        return this.commentsHash[id];
    }

    /**
     * Post a new comment
     * @param { String } slug
     * @param { String } comment
     * @param { String } name
     * @param { String } email
     * @param { String } parentId
     * @return { Promise }
     */
    postComment(slug, comment, name, email, parentId) {
        return ajax(`${this.endpoint}/comment/`, 'POST', { slug, comment, name, email, parent_id: parentId }); // eslint-disable-line
    }

    /**
     * Update a comment
     * @param { String } commentId
     * @param { String } comment
     * @param { String } secret
     * @return { Promise }
     */
    updateComment(commentId, secret, comment) {
        return ajax(`${this.endpoint}/comment/${commentId}`, 'PATCH', { comment, user_secret: secret });
    }

    /**
     * Delete a comment
     * @param { String } commentId
     * @param { String } secret
     * @return { Promise }
     */
    deleteComment(commentId, secret) {
        return ajax(`${this.endpoint}/comment/${commentId}`, 'DELETE', { user_secret: secret });
    }

    /**
     * Validate comment by sending validation data to API and refresh commentlist after that
     * @param { String } commentId
     * @param { String } secret
     * @return { Promise }
     */
    validateComment(commentId, secret) {
        return ajax(`${this.endpoint}/comment/validate/${commentId}/`, 'POST', { user_secret: secret });
    }

    /**
     * Update user notification preferences for an article
     * @param { String } articleId
     * @param { String } userId
     * @param { String } secret
     * @param { Bool } subscribe
     * @return { Promise }
     */
    updateNewCommentsSubscription(articleId, userId, secret, subscribe) {
        return ajax(`${this.endpoint}/notification/article/${articleId}/`, 'PATCH', { subscribe, user_id: userId, user_secret: secret });
    }
}

export default Jamments;
