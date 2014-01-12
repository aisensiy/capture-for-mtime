// init casper and inject two common js to pages
var casper = require('casper').create({
  clientScripts: [
    "bower_components/jquery/jquery.js",
    "bower_components/underscore/underscore.js"
  ],
  verbose: true
});

var fs = require('fs');

var _ = require('./node_modules/underscore/underscore-min.js');

var utils = require("utils");

var final_data = [];

var director_names = [
  '张艺谋',
  '冯小刚',
  '陈凯歌',
  '杜琪峰',
  '徐克',
  '王家卫'
];

var directors = [
  "http://people.mtime.com/893000/filmographies/", // 张艺谋
  "http://people.mtime.com/892845/filmographies/", // 冯小刚
  "http://people.mtime.com/892816/filmographies/", // 陈凯歌
  "http://people.mtime.com/892840/filmographies/", // 杜琪峰
  "http://people.mtime.com/892903/filmographies/", // 徐克
  "http://people.mtime.com/892953/filmographies/"  // 王家卫
];

directors = _.zip(directors, director_names);

utils.dump(directors);
/**
 * get links of movie page from the director page
 */
var get_movie_link_elements = function () {
  var link_elements = $("#filmographyListDiv .ele_img_content dd.c_000 a");
  return _.map(link_elements, function (elem, index) {
    return elem.href + 'fullcredits.html';
  });
}

/**
 * get page links from pagination
 */
var get_page_links = function() {
  return _.filter(_.map($("#PageNavigator a.num"), function (elem, idx) {
    return elem.href;
  }), function(elem) { return !/^\s*$/g.test(elem); } ) || [];
};

var get_movie_name = function () {
  return $('h1.movie_film_nav a:first').text();
};

var get_directorname = function () {
  return $('#Director').first().next().next().find('a').first().text();
};

var links = [];

/**
 * call the get_movie_links in casper
 */
var get_movie_links = function() {
  title = this.getTitle();
  this.echo(title);
  var links_of_page = this.evaluate(get_movie_link_elements);
  links = links.concat(links_of_page);
  utils.dump(links);
};

var get_actors = function() {
  return _.map($('.staff_actor_list:has(img) a:nth-child(2)'), function(elem) { return $(elem).text().trim(); });
};

var pages;
var current_director;

casper.start();

casper.then(function() {
  this.each(directors, function (self, director) {
    current_director = director[1];
    console.log(current_director);
    self.thenOpen(director[0], function() {
      pages = this.evaluate(get_page_links);
      utils.dump(pages);
      get_movie_links.call(this);
    });
  });
});

casper.then(function () {
  this.each(pages, function(casper, pageurl) {
    console.log(pageurl);
    casper.thenOpen(pageurl, function() {
      get_movie_links.call(this);
    });
  });
});

casper.then(function () {
  this.each(links, function (casper, moviepage) {
    casper.thenOpen(moviepage, function() {
      this.echo(this.evaluate(get_movie_name));
      utils.dump(casper.evaluate(get_actors).slice(0, 10));
      final_data.push({
        'movie': this.evaluate(get_movie_name),
        'director': this.evaluate(get_directorname),
        'actors': casper.evaluate(get_actors).slice(0, 10)
      });
    });
  })
})

var to_csv = function (data) {
  var csv_data = _.map(data, function (elem) {
    return ( [elem.director].concat(elem.actors) ).join(',');
  });

  fs.write('final.csv', csv_data.join('\n'), 'w');
};

casper.run(function () {
  utils.dump(final_data);
  fs.write('final.json', JSON.stringify(final_data, null, '  '), 'w');
  to_csv(final_data);
  this.exit();
});
