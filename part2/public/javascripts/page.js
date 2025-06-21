var posts = [];
var search = null;

/*
 * Hides the main part of the page to show the Ask a Question section
 */
function showAsk(){
    var main = document.getElementById("main");
    var ask = document.getElementById("ask");
    main.style.display = "none";
    ask.style.display = "block";
}

/*
 * Hides the Ask a Question section of the page to show the main part,
 * clearing the question input fields.
 */
function showMain(){
    var main = document.getElementById("main");
    var ask = document.getElementById("ask");
    ask.style.display = "none";
    main.style.display = "block";

    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-tags').value = '';
}

/*
 * Creates a new question/post & send it to the server, before triggering an update for the main part of the page.
 */
function createPost(){

    search = null;

    let post = {
        title: document.getElementById('post-title').value,
        content: document.getElementById('post-content').value,
        tags: document.getElementById('post-tags').value.split(" "),
        upvotes: 0
    };

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Define function to run on response
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            // Update the page on success
            loadPosts();
            showMain();
        }
    };

    // Open connection to server & send the post data using a POST request
    // We will cover POST requests in more detail in week 8
    xmlhttp.open("POST", "/addpost", true);
    xmlhttp.setRequestHeader("Content-type", "application/json");
    xmlhttp.send(JSON.stringify(post));

}

/*
 * Updates the search term then reloads the posts shown
 */
function searchPosts(){

    search = document.getElementById('post-search').value.toUpperCase();
    updatePosts();

}


/*
 * Reloads the posts shown on the page
 * Iterates over the array of post objects, rendering HTML for each and appending it to the page
 * If a search term is being used
 */
function updatePosts() {

    // Reset the page
    document.getElementById('post-list').innerHTML = '';

    // Iterate over each post in the array by index
    for(let i=0; i<posts.length; i++){

        let post = posts[i];

        // Check if a search term used.
        if(search !== null){
            // If so, skip this question/post if title or content doesn't match
            if (post.title.toUpperCase().indexOf(search) < 0 &&
                post.content.toUpperCase().indexOf(search) < 0 ) {
                continue;
            }
        }

        // Generate a set of spans for each of the tags
        let tagSpans = '';
        for(let tag of post.tags){
            tagSpans = tagSpans + `<span class="tag">${tag}</span>`;
        }

        // Generate the post/question element and populate its inner HTML
        let postDiv = document.createElement("DIV");
        postDiv.classList.add("post");

        postDiv.innerHTML = `
            <div class="votes">
                <button onclick="upvote(${i})">+</button>
                <p><span class="count">${post.upvotes}</span><br />votes</p>
                <button onclick="downvote(${i})">-</button>
            </div>
            <div class="content">
                <h3><a href="#">${post.title}</a></h3>
                <i>By ${post.author}</i>
                <p>${post.content}</p>
                ${tagSpans}<span class="date">${new Date(post.timestamp).toLocaleString()}</span>
            </div>
        `;

        // Append the question/post to the page
        document.getElementById("post-list").appendChild(postDiv);

    }


}

/*
 * Loads posts from the server
 * - Send an AJAX GET request to the server
 * - JSON Array of posts sent in response
 * - Update the
 */
function loadPosts() {

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Define function to run on response
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            // Parse the JSON and update the posts array
            posts = JSON.parse(this.responseText);
            // Call the updatePosts function to update the page
            updatePosts();
        }
    };

    // Open connection to server
    xmlhttp.open("GET", "/posts", true);

    // Send request
    xmlhttp.send();

}


/*
 * Increase the votes for a given post, then update the page
 */
function upvote(index) {
    posts[index].upvotes ++;
    updatePosts();
}

/*
 * Decrease the votes for a given post, then update the page
 */
function downvote(index) {
    posts[index].upvotes --;
    updatePosts();
}


function login(){

    let user = {
        user: document.getElementById('username').value,
        pass: document.getElementById('password').value
    };

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Define function to run on response
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            alert("Welcome "+this.responseText);
        } else if (this.readyState == 4 && this.status >= 400) {
            alert("Login failed");
        }
    };

    // Open connection to server & send the post data using a POST request
    // We will cover POST requests in more detail in week 8
    xmlhttp.open("POST", "/users/login", true);
    xmlhttp.setRequestHeader("Content-type", "application/json");
    xmlhttp.send(JSON.stringify(user));

}

function logout(){

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Open connection to server & send the post data using a POST request
    xmlhttp.open("POST", "/users/logout", true);
    xmlhttp.send();

    sessionStorage.clear();
    window.location.href = "index.html";

}

// In your Express.js backend routes file
app.get('/api/dogs', async (req, res) => {
  try {
    const username = req.query.owner || req.session.username;

    // First get the user_id from username
    const userQuery = 'SELECT user_id FROM Users WHERE username = ?';
    const [users] = await db.query(userQuery, [username]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].user_id;

    // Then get all dogs for this user
    const dogsQuery = 'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?';
    const [dogs] = await db.query(dogsQuery, [userId]);

    res.json(dogs);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// Alternative: Get dogs for the currently logged-in user
app.get('/api/owner/dogs', async (req, res) => {
  try {
    // Assuming you store user_id in session after login
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const query = 'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?';
    const [dogs] = await db.query(query, [userId]);

    res.json(dogs);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});