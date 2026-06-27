# Views Directory

This directory is reserved for server-side rendered templates (e.g., EJS, Pug, Handlebars).

## Usage

If you need to implement server-side rendering:

1. Install a template engine:
   ```bash
   npm install ejs
   ```

2. Configure Express in `app.js`:
   ```javascript
   const path = require('path');
   app.set('view engine', 'ejs');
   app.set('views', path.join(__dirname, 'views'));
   ```

3. Create template files:
   - `views/layouts/main.ejs` - Main layout
   - `views/pages/home.ejs` - Page templates
   - `views/partials/header.ejs` - Reusable components

4. Render views in controllers:
   ```javascript
   res.render('pages/home', { title: 'Home', user: req.user });
   ```

## Note

For API-only backends (React, Vue, Angular frontend), this directory can be removed.
