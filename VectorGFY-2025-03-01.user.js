// ==UserScript==
// @name         VectorGFY
// @namespace    http://tampermonkey.net/
// @version      2025-03-01
// @description  Auto-complete Vector LMS videos
// @author       9021007
// @match        https://*.vectorlmsedu.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==


// Vector can suck it
// Based on https://www.reddit.com/r/CalPoly/comments/y1z97v/script_to_skip_the_vector_lms_trainings/

let urlBase = "https://" + window.location.href.split("/")[2];

function asyncWaitSeconds(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, seconds * 1000);
  });
}

async function watchVideo(work_id, item_id, time_min, title){
  //request the tracking start
  let tracking_start_url = urlBase + "/rpc/v2/json/training/tracking_start?course_item_id="+ item_id +"&course_work_id="+work_id;
  const tracking_start_response = await fetch(tracking_start_url);
  let tracking_start_data = await tracking_start_response.json();
  let work_hist_id = tracking_start_data.course_work_hist_id;
  console.log("Video time tracking started for video: " + title);

  //delay for video length
  console.log("Waiting for the length of the video, " + time_min*60 + " seconds...");
  await asyncWaitSeconds(time_min*60);
  console.log("Wait finished.");

  //request the tracking finish
  let tracking_finish_url = urlBase + "/rpc/v2/json/training/tracking_finish?course_work_hist_id="+ work_hist_id + "&_="+ (Date.now() + time_min*60*1000).toString();
  const tracking_finish_response = await fetch(tracking_finish_url);
  let tracking_finish_data = await tracking_finish_response.json()
  let completed = !(tracking_finish_data.tracking_status); //0 is completed, 1 is not completed, 2 is previously completed (but we filtered those)

  if(completed){
    console.log("Completed Video: " + title);
  }
  else{
    console.log("Failed to Complete Video: " + title);
  }
}

async function main(){
  console.log("VectorGFY TM");
  let TOC_items = document.getElementsByClassName("TOC_item");

  let TOC_unwatched_videos = [];

  //scrape the /training/launch/course_work/COURSEID page for video data
  for (let i = 0; i < TOC_items.length; i++){
    console.log(i);
    let data_entry = {}
    data_entry.element = TOC_items[i];
    data_entry.isVideo = TOC_items[i].querySelector(".fa-play") != null;
    data_entry.href = TOC_items[i].getAttribute("href");
    data_entry.title = TOC_items[i].querySelector(".lead").innerText;
    console.log(TOC_items[i].getAttribute("href"));
    if(!data_entry.href) {
      console.log("Skipping item with no href: " + data_entry.title);
      continue;
    }
    let len = TOC_items[i].getAttribute("href").split("?")[0].split("/").length;
    data_entry.work_id = TOC_items[i].getAttribute("href").split("?")[0].split("/")[len-1];
    data_entry.item_id = TOC_items[i].getAttribute("href").split("?")[0].split("/")[len-2];
    if(!data_entry.isVideo){
      console.log("Skipping non-video item: " + data_entry.title);
	    continue;
    }
    // check text in a.TOC_item -> div#section_item_0 -> div.col -> div.visible-xs -> div
    // if the text contains "Completed" then skip
    if(TOC_items[i].querySelector("div.visible-xs").innerText.includes("Completed")){
      console.log("Skipping completed video: " + data_entry.title);
      continue;
    }

    data_entry.time_min = parseInt(TOC_items[i].querySelector(".span_link").innerText.split(" ")[1]) + .5;
    data_entry.completed = false;
    await watchVideo(data_entry.work_id, data_entry.item_id, data_entry.time_min, data_entry.title);
    // refresh page to update the progress and re-fetch TOC items
    location.reload();
    console.log("done with " + i.toString());
  }
}
main().then();