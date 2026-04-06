# Word Test Playground

This is a static website for elementary school English word tests. It works with GitHub Pages because it uses only plain HTML, CSS, and JavaScript.

## Features

- Upload a CSV file with one column of English words
- Enter a username and automatically create test IDs like `username-1`, `username-2`, `username-3`
- Pronounce each word using the browser speech engine
- Show the word and fetch a simple English meaning
- Record answers as `I know it`, `Not sure`, and `I don't know`
- Review previous test records in the browser

## Important note

Because this is a static site, the uploaded vocabulary, test counters, and history are stored in the browser with `localStorage`.

- Data is saved only on the browser/device being used
- If the browser storage is cleared, the records are removed
- If you want shared records across different devices, you will need a backend later

## CSV format

Use a CSV file with one word per line, for example:

```csv
apple
banana
teacher
computer
```

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md`.
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select your main branch and the `/ (root)` folder.
6. Save, then wait for GitHub Pages to publish the site.

## Local preview

You can open `index.html` directly in a browser, or serve the folder with a small local server.
