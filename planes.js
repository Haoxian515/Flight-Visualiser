$( document ).ready(function() {

    // Loop to get Quarters
    $.ajax({
        url : "quarters.txt",
        dataType: "text",
        success : function (data) {

            let options = data.split("\n")
            
            let allOptions = ""
            for(let i = 0 ; i < options.length; i++){
                allOptions += "<option value=\" " + (i+1) + "\" name=\"" + options[i] + "\">" + options[i] + "</option>"
            }
            $("#quarter").html(allOptions);
        }
    });

    //GET YEARS
    $.ajax({
        url : "years.txt",
        dataType: "text",
        success : function (data) {
            let years = data.split("\n")
            let allYears = ""
            for(let i = 0 ; i < years.length; i++){
                allYears += "<option value=\" " + years[i] + "\" name=\"" + years[i] + "\">" + years[i] + "</option>"
            }
            $("#years").html(allYears);
        }
    });


    $.ajax({
        url : "origins.txt",
        dataType: "text",
        success : function (data) {
            let origins = data.split("\n")
            let allOrigins = ""
            for(let i = 0 ; i < origins.length; i++){
                allOrigins += origins[i]
            }
            $("#origins").html(allOrigins);
        }
    });

});

//Clear out layers to renew map
function reloadMap(map, coords){
    // console.log(coords)
    // console.log(map)
    //remove all layer n refresh 
    map.eachLayer(function (layer) {
        // console.log(layer._url)
        if( !layer._url ){
            map.removeLayer(layer)
        }
    });
    
    var dash_straight = {
        color: 'rgb(145, 146, 150)',
        fillColor: 'rgb(145, 146, 150)',
        dashArray: 8,
        opacity: 0.8,
        weight: '1',
    };

    //L.vezier returnb L.layerGroup(paths);
    //reload and send with right longitute latitudes
    L.bezier({
        path: coords,
        icon: {
            path: "plane.png"
        }
    }, dash_straight).addTo(map);

}


//Draw markers from ajax resul coords
function drawMarkers(map, markerCoords){
    setTimeout(function(){
        // var marker = L.marker([36.2744, -119.7751]).addTo(map);
        
        markerCoords.forEach( function(arr){
            var marker = L.marker([ arr[1]["lat"], arr[1]["lng"] ])
            // marker.bindPopup(arr[0]).openPopup();
            console.log(arr)
            pricePopup = "$" + arr[0].toString() +
                         "\n" + "Destination: " + arr[1]["destination"]
            marker.bindPopup(pricePopup).openPopup();
            marker.addTo(map)

        })

    },2500)
}

// CALL ajax to get result by gettingmap an selected values
function getFlaskData(map, jsonObj){
    $.ajax({
        type:"POST",    
        url: "http://localhost:5000/test",
        contentType: 'application/json;charset=UTF-8',
        data: JSON.stringify(jsonObj),
        success: function(result, status){
        // $("#div1").html(result);
        // console.log(status)
        // console.log(result)
        reloadMap(map, result)
        },
        complete: function(){
            $.ajax({
                type:"POST",    
                url: "http://localhost:5000/get_prices",
                contentType: 'application/json;charset=UTF-8',
                data: JSON.stringify(jsonObj),
                success: function(result, status){

                // get_price route returns 2 d array with 
                // price in index 0 list coords list in index 2
                // [ price [lat, lng ] ]
                drawMarkers(map, result)
                }
            });
        }
    });
}

//DOCUMENT READY
$(function () { 

    var map = L.map('map').setView([39.927, -92.861], 4);

    map.scrollWheelZoom.disable();
    map.on('zoomend', function() {
        getFlaskData(map, testingObj)
    });
    map.on('moveend', function() {
        getFlaskData(map, testingObj)
    });
    

    L.tileLayer('https://cartodb-basemaps-c.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        maxZoom: 18,
        id: 'mapbox.streets',

    }).addTo(map);
    var dash_straight = {
        color: 'rgb(145, 146, 150)',
        fillColor: 'rgb(145, 146, 150)',
        dashArray: 8,
        opacity: 0.8,
        weight: '1',
    };

    L.bezier({
        path: [
            [
                {lat: 40.123, lng: -74.7718, slide: 'LEFT_ROUND'},//NYC
                {lat: 36.2744, lng: -119.7751,slide: 'LEFT_ROUND'},//CA
                // {lat: 36.2048, lng: 138.2529}//Japan
            ]
        ],
        icon: {
            path: "plane.png"
        },

    }, dash_straight).addTo(map);


    let testingObj;
    $("#select-options").on("change", function(){
        console.log("on change")
        var quarter = $(this).children()[0].value
        var year = $(this).children()[1].value
        var city = $(this).children()[2].value

        jsonObj = {
            "quarter": quarter,
            "year": year,
            "city": city
        }
        testingObj = jsonObj
        console.log(testingObj)
        getFlaskData(map, jsonObj)
        
    })


});