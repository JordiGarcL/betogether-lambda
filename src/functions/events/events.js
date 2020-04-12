const db = require('../../util/db');
const uploadImage = require('../../util/uploadImage'); 

exports.getEvents = async (event, context, callback) => {
    var response = {}
    var sql = `
      SELECT item.id, item.title, item.description, item.app_user, item.creation, IFNULL(votes.total, 0) as votes, category.category, event.event_start, event.event_end, item.image, item.url, event.hashtag
      FROM item
      INNER JOIN event
      ON item.id = event.id
      INNER JOIN category on item.category = category.id
      LEFT JOIN (
          SELECT item, COUNT(*) as total
          FROM vote
          WHERE voted IS TRUE
          GROUP BY item) votes ON item.id = votes.item;
    `

    try {
        var results = await db.query(sql);
        await db.end();

        response.status = 200
        response.events = results
    }
    catch(err) {
        response.status = 500
    }

    return {
        'statusCode': response.status,
        'body': JSON.stringify(response)
    };
};

exports.getEventsByCategory = async (event, context, callback) => {
  console.log(event.queryStringParameters.category)
  var response = {}
  var sql = `
    SELECT item.id, item.title, item.description, item.app_user, item.creation, IFNULL(votes.total, 0) as votes, category.category, event.event_start, event.event_end, item.image, item.url, event.hashtag
    FROM item
    INNER JOIN event
    ON item.id = event.id
    INNER JOIN category on item.category = category.id
    LEFT JOIN (
        SELECT item, COUNT(*) as total
        FROM vote
        WHERE voted IS TRUE
        GROUP BY item) votes ON item.id = votes.item
    WHERE category.category = (?);
  `

  try {
      var results = await db.query(sql, [event.queryStringParameters.category]);
      await db.end();

      response.status = 200
      response.events = results
  }
  catch(err) {
      response.status = 500
  }

  return {
      'statusCode': response.status,
      'body': JSON.stringify(response)
  };
};

exports.getEventsByUser = async (event, context, callback) => {
  console.log(event.queryStringParameters.category)
  var response = {}
  var sql = `
    SELECT item.id, item.title, item.description, item.app_user, item.creation, IFNULL(votes.total, 0) as votes, category.category, event.event_start, event.event_end, item.image, item.url, event.hashtag
    FROM item
    INNER JOIN event
    ON item.id = event.id
    INNER JOIN category on item.category = category.id
    LEFT JOIN (
        SELECT item, COUNT(*) as total
        FROM vote
        WHERE voted IS TRUE
        GROUP BY item) votes ON item.id = votes.item
    WHERE item.app_user = (?);
  `

  try {
      var results = await db.query(sql, [event.queryStringParameters.user]);
      await db.end();

      response.status = 200
      response.events = results
  }
  catch(err) {
      response.status = 500
  }

  return {
      'statusCode': response.status,
      'body': JSON.stringify(response)
  };
};

exports.postEvent = async (event, context, callback) => {
  var response = {}
  var datetime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  var request = JSON.parse(event.body)
  var response = {}

  var categoryId = {
    'eventCategories.Ejercicio': 3,
    'activityCategories.Cocinitas': 3,
    'activityCategories.Cultura': 3,
    'activityCategories.Peques': 3,
    'activityCategories.Fiesta': 3,
    'activityCategories.Otros': 3
}

  var sqlItem = `
    INSERT INTO item(id, title, image, description, category, app_user, creation)
    VALUES(DEFAULT, ?, ?, ?, ?, ?, ?)
  `
  var sqlEvent = `
    INSERT INTO event(id, event_start, event_end, hashtag) 
    VALUES(?, ?, ?, ?)
  `

  var imageResponse = await uploadImage(request.image)
  console.log(imageResponse)
  if (imageResponse.url) {
    console.log('EXIT IMAGE')
    request.image_url = imageResponse.url
  } else {
    console.log('NO EXIT IMAGE')
    request.image_url = ''
  }
  delete request.image;

  try {
    var results = await db.transaction()
      .query(sqlItem, [request.title, request.image_url, request.description, categoryId[request.category], request.app_user, datetime])
      .query((r) => [sqlEvent, [r.insertId, request.event_start, request.event_end, request.hashtag]])
      .commit();
    await db.end();

    request.id = results[0].insertId

    response.status = 200
    response.event = request
  }
  catch(err) {
    console.log(err)
    response.status = 500
  }

  return {
    'statusCode': response.status,
    'body': JSON.stringify(response)
  };
};
