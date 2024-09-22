import express from "express";
import bodyParser from "body-parser";
import axios, { Axios } from "axios";
import pg from "pg";

const app = express();
const port = 3000;
const URL = "https://openlibrary.org/";
const book = [{
    "author_key": [
        "OL1656199A"
    ],
    "author_name": [
        "Herb Cohen"
    ],
    "cover_edition_key": "OL24938006M",
    "cover_i": 9730614,
    "ddc": [
        "158.5"
    ],
    "ebook_access": "borrowable",
    "ebook_count_i": 1,
    "edition_count": 1,
    "edition_key": [
        "OL24938006M"
    ],
    "first_publish_year": 1982,
    "has_fulltext": true,
    "ia": [
        "youcannegotiatea1980cohe"
    ],
    "ia_collection": [
        "georgetown-university-law-library-ol",
        "inlibrary",
        "internetarchivebooks",
        "openlibrary-d-ol",
        "printdisabled"
    ],
    "ia_collection_s": "georgetown-university-law-library-ol;inlibrary;internetarchivebooks;openlibrary-d-ol;printdisabled",
    "isbn": [
        "9780553203035",
        "0553203037"
    ],
    "key": "/works/OL16036139W",
    "language": [
        "eng"
    ],
    "last_modified_i": 1589844639,
    "lending_edition_s": "OL24938006M",
    "lending_identifier_s": "youcannegotiatea1980cohe",
    "number_of_pages_median": 255,
    "oclc": [
        "8251514"
    ],
    "osp_count": 70,
    "printdisabled_s": "OL24938006M",
    "public_scan_b": false,
    "publish_date": [
        "1982"
    ],
    "publish_place": [
        "Toronto",
        "New York"
    ],
    "publish_year": [1982],
    "publisher": [
        "Bantam Books"
    ],
    "seed": [
        "/books/OL24938006M",
        "/works/OL16036139W",
        "/authors/OL1656199A",
        "/subjects/negotiation",
        "/subjects/negociación"
    ],
    "title": "You can negotiate anything",
    "title_suggest": "You can negotiate anything",
    "title_sort": "You can negotiate anything",
    "type": "work",
    "subject": [
        "Negotiation",
        "Negociación"
    ],
    "ia_loaded_id": [
        "youcannegotiatea1980cohe"
    ],
    "ia_box_id": [
        "IA124308"
    ],
    "ratings_count_1": 0,
    "ratings_count_2": 0,
    "ratings_count_3": 0,
    "ratings_count_4": 1,
    "ratings_count_5": 0,
    "ratings_average": 4,
    "ratings_sortable": 2.3286738,
    "ratings_count": 1,
    "readinglog_count": 26,
    "want_to_read_count": 23,
    "currently_reading_count": 3,
    "already_read_count": 0,
    "publisher_facet": [
        "Bantam Books"
    ],
    "subject_facet": [
        "Negociación",
        "Negotiation"
    ],
    "_version_": 1.7958592213910815e+18,
    "author_facet": [
        "OL1656199A Herb Cohen"
    ],
    "subject_key": [
        "negociación",
        "negotiation"
    ],
    "ddc_sort": "158.5"
}];

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "books",
    password: "Whyrohith@913370.",
    port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


//store the book in the database
async function storebook(book) {
    try {
        const result = await db.query("INSERT INTO book (book_name, author_name, pub_date, rating, cover_i) VALUES ($1, $2, $3, $4, $5) RETURNING *", [
            book.title,
            book.author_name.join(', '),
            book.first_publish_year,
            book.ratings_average,
            book.cover_i
        ]);
        return result.rows[0];
    } catch (error) {
        console.log(error);
    }
}

async function get_books(filter) {
    var result;
    switch (filter) {
        case 'date':
            try {
                result = await db.query("SELECT * FROM book JOIN notes ON book.id = notes.book_id ORDER BY notes.date_read DSC;");
                return result.rows;
            } catch (error) {
                console.log(error);
            }
            break;
        case 'rating':
            try {
                result = await db.query("SELECT * FROM book JOIN notes ON book.id = notes.book_id ORDER BY notes.rating DSC;");
                return result.rows;
            } catch (error) {
                console.log(error);
            }
            break;
        default:
            try {
                result = await db.query("SELECT * FROM book JOIN notes ON book.id = notes.book_id ORDER BY book.book_name ASC");
                return result.rows;
            } catch (error) {
                console.log(error);
            }
            break;
    }

}



app.get("/", async (req, res) => {
    const result = await get_books();
    res.render("index.ejs", { books: result });
});

app.get("/search", (req, res) => {
    res.render("search.ejs");
});

app.post("/search", async (req, res) => {
    const query = req.body.book.replaceAll(" ", "+");
    try {
        const response = await axios.get(URL + "search.json?q=" + query);
        const searchQuery = response.data.docs;
        // console.log(searchQuery);
        // console.log(searchQuery)
        res.render("search.ejs", { searchQuery: searchQuery });
    } catch (error) {
        res.render("search.ejs", { error: "Not Found" });
    }
});

app.post("/addbook", async (req, res) => {
    const result = JSON.parse(req.body.book);
    //Once user click on add this book the book will be stored in the database.
    const added_book = await storebook(result);
    // console.log(added_book);
    res.render("addbook.ejs", { element: added_book });

    // console.log(result);
});


//adding the notes to the database with book_id.
app.post("/notes", async (req, res) => {
    console.log(req.body.date);
    const notes = [req.body.summary, req.body.notes,
    req.body.date,
    req.body.rating,
    req.body.book_id
    ];
    try {
        await db.query("INSERT INTO notes (summary, notes, date_read, user_rating, book_id) VALUES ($1,$2,$3,$4,$5)", notes);
        res.redirect("/");
    } catch (error) {
        console.log(error);
    }
});


app.post("/viewnotes", (req, res) => {
    const result = JSON.parse(req.body.notes);
    console.log(result);
});


app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});