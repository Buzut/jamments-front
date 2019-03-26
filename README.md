# Jamments front
This library is to be used with [Jamments](https://github.com/Buzut/jamments) comment API.

Jamments is a self hosted commenting API that puts you in control. It's a dead simple REST API that seamlessly integrates with your already existing [JAMstack](https://jamstack.org/).

This is the frontend API library for [Jamments' API](https://buzut.github.io/jamments/api/). Its aim is to ease Jamments integration within your code. You should go to [the documentation](https://github.com/Buzut/jamments-front) for more details.

Also note that this library uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and that it [might not be available](https://caniuse.com/#feat=fetch) in older browsers. If you're willing to support older browsers, you can easily [polyfill](https://github.com/github/fetch) it.

## Exemple
Here's how you post a new comment
```javascript
jamments.postComment(slug, comment, name, email, parentId)
.then(() => {
    // comment successfully submitted to the api
})
.catch((err) => {
    // Houston, we had a problem
});
```
