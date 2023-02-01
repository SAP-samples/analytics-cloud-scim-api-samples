//
//
//
//
//  Sample script to download the activities log from SAP Analytics Cloud
//  This sample is provided 'as is'
//
//  Developed by Matthew Shaw, SAP https://people.sap.com/matthew.shaw/#content:blogposts
//
//	Version 0.8.1
//  February 2023
//
//
//  For full step-by-step instructions please visit the blog and download the user guide
//
//  Blog: https://blogs.sap.com/2023/01/18/sap-analytics-cloud-activities-log-command-line-interface-cli-to-automate-downloads-associated-best-practices/
//  User Guide: https://d.dam.sap.com/a/L1SUAhp/SAP%20SAC%20Activities%20Log%20Sample%20Scripts%20User%20Guide.pdf?rc=10

//
//
//  Feel free to change the default option to another valid option. It saves you having to provide a command line argument
const default_option = 'help';
//  Possible values: help,
//					 all,
//                   oldestday,   eachfullday,   lastfullday,   currentday 
//                   oldestweek,  eachfullweek,  lastfullweek,  currentweek
//                   oldestmonth, eachfullmonth, lastfullmonth, currentmonth 

//
//
//  if default_option is lastfullday, lastfullweek or lastfullmonth then you can specify the default number of periods. It must be a positive integer
const default_periods = 1;
//  for example if "default_periods = 2" and you use "lastfullweek" as the option, then the last two full weeks of logs will be created.
//  (this assumes there are activity logs for those periods of course, so whilst you may request say '10' periods, you will only get files created if there are
//   activities for those periods)


//
//
//  The name of the Postman environment you have configured and then exported as a file.
//  Be sure to press the 'Persist All' button BEFORE you export this environment, otherwise the variables you've configured may not be exported
//  It is this environment that points to an OAuth client in a SAP Analytics Cloud Service. If you have multiple SAP Analytics Cloud Services, you'll need to
//  duplicate this script, one for each environment. Each script will have a different environment and a different friendly_service_name (set above)
const environment 	= "./Production SAP Analytics Cloud Service.postman_environment.json";
//
//
//  The folder to store the .csv log files
//  Make sure the folder exists and there is a '/' at the end of the folder name
const folder = "./logs/";
//  example:
//      const folder = "./";


//
//
//  The name of the .csv file starts with 'ActivityLog' but feel free to change this to something else
let   base_filename = "ActivityLog";

//
//
//  if you'd prefer to use a non-dynamic filename, then you can opt for a fixed filename by changing this setting to true
//  however it is only applicable if the option is either 'all' or 'lastfullday, lastfullweek or lastfullmonth' with the periods set to 1
const use_fixed_filename = false;
//
//  and if use_fixed_filename is true, then the fixed_filename can be defined here
const fixed_filename = "ActivityLog.csv";
//
//
//  As each request to the SAP Analytics Cloud API is made, that request can be displayed to the console.
//	This can be helpful to see the progress when the download takes a long time, or if the download fails for some reason
//  The amount of console logging, when set to true, is very low and quite safe to leave enabled
//  The default is 'true' but feel free to set this to 'false' to enable a more silent run
const display_requests = true;

//
//
//  The name of the Postman collection. This is unlikely to change
const collection_name="./Activities 4101-All-Es-Download All Activities (nodejs).postman_collection.json";

//
//
//  if false then the postman console logs AND all requests are written to the main console making this slightly more verbous logging.
//  The default is 'true' but if you want to troubleshoot, then set this to 'false'
const newman_reporter_cli_silent = true;
//
//
//


//  Looking for where to specify the Time Zone? or the SAC Service friendly name? The please edit the Postman Environment.json as these are defined there




//
//
//	In general please do not edit below this line
//
//
//
const postman_environment = require(environment);	// load the environment as we need to read some of the values from there, namely timezone and SAC service friendly name
const postman_environment_variable_values=postman_environment.values
let   postman_environment_variable_TimeZoneHours  =postman_environment_variable_values.find( entry => entry.key==='TimeZoneHours'   && entry.enabled===true );
let   postman_environment_variable_TimeZoneMinutes=postman_environment_variable_values.find( entry => entry.key==='TimeZoneMinutes' && entry.enabled===true );


const postman_environment_variable_SACservicefriendlyname = postman_environment_variable_values.find( entry => entry.key==='SACservicefriendlyname' && entry.enabled===true );
const postman_environment_variable_SACserviceFQDN         = postman_environment_variable_values.find( entry => entry.key==='SACserviceFQDN'  && entry.enabled===true ).value;

const friendly_service_name = postman_environment_variable_SACservicefriendlyname === undefined ?
		(postman_environment_variable_SACserviceFQDN.substring(0, postman_environment_variable_SACserviceFQDN.indexOf("."))) : postman_environment_variable_SACservicefriendlyname.value;
		
base_filename = base_filename.concat("_",friendly_service_name,"_");

// test if the variables exist or not.
// for the postman_environment_variable_TimeZoneMinutes, if the variable is missing we shall use the local timezone, so we shall grab the TimezoneOffset
postman_environment_variable_TimeZoneHours   = postman_environment_variable_TimeZoneHours  ===undefined ? 0 : parseInt(postman_environment_variable_TimeZoneHours.value);
postman_environment_variable_TimeZoneMinutes = postman_environment_variable_TimeZoneMinutes===undefined ? -(new Date().getTimezoneOffset()) : parseInt(postman_environment_variable_TimeZoneMinutes.value);
// we shall store the total number of minutes in a single variable TimeZoneMinutes
// this TimeZoneMinutes will be used when we create a new date based off todays date as we'll need to adjust that date to be the right timezone for the comparisions of date parts (date, month, year).
let TimeZoneMinutes = postman_environment_variable_TimeZoneMinutes + (postman_environment_variable_TimeZoneHours * 60);

//
//
//
//
const newman 		= require('newman'); // require newman in your project. 
const filesystem 	= require('fs'); 	 // require fs, this is likely to require that you run "npm link newman" to include the fs libraries into your node.js project
let   activities_array = [] ; 			 // an empty array that will store all the console output from newman
let   newmanconsoleerrors =[]; 			 // an empty array that will store all the console error output from newman


const option_argument_passed=process.argv.slice(2)[0];
const option=(option_argument_passed===undefined) ? default_option : option_argument_passed; // if an invalid argument is passed we'll default to the default_option


const periods_argument_passed=process.argv.slice(3)[0];
let   periods=( (periods_argument_passed===undefined) || (isNaN(periods_argument_passed)) ) ? default_periods : parseInt(periods_argument_passed);
switch (option)
	{
		case 'lastfullday':
		case 'lastfullweek':
		case 'lastfullmonth':
		{
			periods=(periods<1) ? 1 : periods;
			break;
		}
		default:
		{
			periods=1;
			break;
		}	
	}

const valid_options=['all',
				'oldestday','eachfullday','lastfullday','currentday',
				'oldestweek','eachfullweek','lastfullweek','currentweek',
				'oldestmonth','eachfullmonth','lastfullmonth','currentmonth']

if (!valid_options.includes(option_argument_passed))
{
	console.log('Downloads the User Activity Logs from SAP Analytics Cloud and creates one or multiple .csv files');
	console.log();
	console.log('Usage : node nodejs_4101_download_activities.js option [lastperiods]');
	console.log();
	console.log('option:');
	console.log();
	console.log('        help : displays this help description');
	console.log();
	console.log('         all : all activity logs & creates a single file e.g. '+base_filename+'2022_04_20_06_22_to_2022_11_29_07_28');
	console.log();
	console.log('  oldestday  : first, likely incomplete, day & creates a single file                e.g. '+base_filename+'YMD_2022_04_20_tail');
	console.log('  eachfullday: creates a file for each day that has a complete set of activities    e.g. '+base_filename+'YMD_2022_04_21_full ...');
	console.log('  lastfullday: yesterday\'s activities & creates a single file (run daily)           e.g. '+base_filename+'YMD_2022_11_29_full');
	console.log('  currentday : today\'s activities so far, so incomplete, & creates a single file    e.g. '+base_filename+'YMD_2022_11_30_head');
	console.log();
	console.log('  oldestweek  : first, likely incomplete, week & creates a single file                 e.g. '+base_filename+'YWk_2022_16_tail');
	console.log('  eachfullweek: creates a file for each week that has a complete set of activities     e.g. '+base_filename+'YWk_2022_17_full ...');
	console.log('  lastfullweek: last week\'s activities & creates a single file (run weekly)            e.g. '+base_filename+'YWk_2022_46_full');
	console.log('  currentweek : this week\'s activities so far, so incomplete, & creates a single file  e.g. '+base_filename+'YWk_2022_47_head');
	console.log();
	console.log('  oldestmonth  : first, likely incomplete, month & creates a single file                e.g. '+base_filename+'YM_2022_04_tail');
	console.log('  eachfullmonth: creates a file for each month that has a complete set of activities    e.g. '+base_filename+'YM_2022_05_full ...');
	console.log('  lastfullmonth: last month\'s activities & creates a single file (run monthly)          e.g. '+base_filename+'YM_2022_10_full');
	console.log('  currentmonth : this month\'s activities so far, so incomplete, & creates a single file e.g. '+base_filename+'YM_2022_11_head');
	console.log();
	console.log('  [lastperiods] is optional and only applicable for lastfullday, lastfullweek and lastfullmonth.');
	console.log('  It is the number of last periods, for example \'lastfullday 2\' is the last 2 full days.');
	console.log('  If not specified the default is 1 making \'lastfullday\' the same as \'lastfullday 1\'');
	console.log();
	if (option != 'help')
	{
		switch (default_option)
		{
			case 'lastfullday':
			case 'lastfullweek':
			case 'lastfullmonth':
			{
				console.log('No valid option specified, using: '+default_option+' '+periods);
				break;
			}
			case 'help':
			{
				break;
			}
			default:
			{
				console.log('No valid option specified, using: '+default_option);
				break;
			}	
		}
	}
}


if (valid_options.includes(option))
{

	// when downloading the activities we don't need to download all of them as this could take some time
	// so we can limit the download of the logs by using a filter on the 'from' value.
	// this 'from' value is passed into the Postman collection and picked up by the 'All Activities Log' Pre-request Script. 
	// if the 'from' value has a value then the {{body}} variable is updated, otherwise it is left blank.
	// the script works by processing each line/row/entry of the activity log, line by line. It is the changing of the date between one row and the next
	// that determines if a period of time (day, week, month) is complete or not (full or not). So any filter needs to bring back more data to allow for this 
	// to occur. Hence the filters on dates are much longer than you may think are necessary and it allows for many days where there may not be any activity at all
	// The format of the date is YYYYMMDD
	// If the filter_from variable is passed into Postman and it is used in the 'body' of the request.

	const filter_from_date = new Date();  // no need to change timezone offset as this must be in GMT as the API only works in GMT
	filter_from_date.setMinutes(filter_from_date.getMinutes() - filter_from_date.getTimezoneOffset());  // this is to set the date to be GMT, the same time zone as used in the Activities log
	let filter_from='';
	switch (option)
	{
		case 'lastfullday':
		case 'currentday':
		{
			// set the filter to be 6 days before, just to be on the safe side
			// We need to getMonth()+1 because January is 0 so this makes January a 1.
			filter_from_date.setDate(filter_from_date.getDate()-(periods+6));
			filter_from=filter_from_date.getFullYear().toString().concat(("0"+(filter_from_date.getMonth()+1)).slice(-2),("0"+filter_from_date.getDate()).slice(-2))
			break;
		}
		case 'lastfullweek':
		case 'currentweek':
		{
			// set the filter to be 10 days after plus a week, just to be on the safe side
			// We need to getMonth()+1 because January is 0 so this makes January a 1.
			filter_from_date.setDate(filter_from_date.getDate()-(periods*7+10));
			filter_from=filter_from_date.getFullYear().toString().concat(("0"+(filter_from_date.getMonth()+1)).slice(-2),("0"+filter_from_date.getDate()).slice(-2))
			break;
		}
		case 'lastfullmonth':
		case 'currentmonth':
		{
			// set the filter to be 19th day two months ago. This allows for some activity between 23rd of that month and the end of that month to allow the script to determine
			// the next month (last month) is a complete 'full' months worth of activity logs. We need to getMonth()+1 because January is 0 so this makes January a 1.
			filter_from_date.setMonth(filter_from_date.getMonth()-(periods+1));
			filter_from=filter_from_date.getFullYear().toString().concat(("0"+(filter_from_date.getMonth()+1)).slice(-2),"23")
			break;
		}
	}  // end switch option

	//
	// if for whatever reason you need to disable this filter then use this line of code that is currently a comment
	// filter_from='';

	//
	//  This script is based off a template provided at https://github.com/postmanlabs/newman to calling Postman as a library function
	//  For more information on the options available please see the link above and engage with the Postman community.
	//
	let header_row;  // used to store the header row, which will be: "Object Type","File Name","Object Name","Description","User Name","Activity","Status","Timestamp","Previous Value","Current Value"
	
	try{
		newman.run(
		{
			collection:  require(collection_name),
			globalVar:   [ {"key":"filter_from", "value":filter_from} ],
			environment: postman_environment,
			reporter: { cli:{ 'silent':newman_reporter_cli_silent, 'bail':true}},
			reporters: 'cli'
		}, function (err, summary)
		{
			if (err || summary.run.error || summary.run.failures.length) 
			{ 
				console.error('The following errors occurred whilst trying to download activity logs from SAP Analytics Cloud:');
				newmanconsoleerrors.forEach( myfunction_displayConsoleErrors )
				function myfunction_displayConsoleErrors(log, index) 
				{
					console.error(" ["+index+"] "+log);
				}; // end myfunction_displayConsoleErrors
				console.error('If the error appears to be with the API, then please either try again later, or log an incident with SAP Support');
				process.exitCode = 1;
			};
		}).on('start', function (err, args)
		{
			console.log('Downloading user activity logs from SAP Analytics Cloud...');
		}).on('request', function (err, args) {

			// a request has completed
			const data_returned_in_responseBody_of_Postman_request_position_in_collection = 2;
			
			// if the 3rd request in the collection has completed (has index=2), then this is the request that might hold the data we need
			if (args.cursor.position===data_returned_in_responseBody_of_Postman_request_position_in_collection)
			{
				// we need to test if the response buffer exists and the response code was a HTTP 200
				var responseBody_buffer = Buffer.from(args.response.stream);
				if (Buffer.isBuffer(responseBody_buffer) && (args.response.code===200) )
				{
					// we have data that we need to store into the variable activities_array
					const lines = responseBody_buffer.toString().split('\n');  // lines is an array, each element is a row
					const first_5_lines = lines.splice(0, 4);         		   // lines has the first 5 lins removed from it, as this is the header
					lines.splice(lines.length - 1, 1);                         // we don't want the last line because this is always empty
					header_row = first_5_lines[2].replace(/\r/g, '');          // the header row is actually the 3rd line and we remove any carriage return
					const total_pages= parseInt((args.response.headers.members).find( responseheader => responseheader.key==='epm-page-count').value);
					for (let line=0; line<(lines.length); line++)
					{
						let columns_array = lines[line].split('","');          // split each row into columns
					
						while (columns_array.length<8)
						{
							// we have fewer columns than we expect. It means the description column has carriage returns in it and we need to 'shift' the rows below up, and join it to this row, minus the carriage returns
							lines[line]=lines[line].concat(" ",lines[line+1]);
							lines.splice(line+1,1);
							columns_array = lines[line].split('","');  
						}
						
						// the column index 7 holds the timestamp
						const timestamp=new Date(columns_array[7]); 
						timestamp.setMinutes(timestamp.getMinutes() + TimeZoneMinutes);  // we add (or substract) the minutes depending upon the timezone before we then re-create the timestamp in the correct time zone
						columns_array[7]= timestamp.getFullYear().toString().concat(".",
																				("0"+(timestamp.getMonth()+1)).slice(-2),".",
																				("0"+ timestamp.getDate()).slice(-2)," ",
																				("0"+ timestamp.getHours()).slice(-2),":",
																				("0"+ timestamp.getMinutes()).slice(-2),":",
																				("0"+ timestamp.getSeconds()).slice(-2)
																				);
						
						//we need to remove the first and last 2 characters from the row as it will be a " and a carriage return that we don't want or need.
						columns_array[0] = columns_array[0].slice(1);
						columns_array[columns_array.length-1] = columns_array[columns_array.length-1].slice(0, -2);
						
						// and we join each column of the row back again with a comma separator and write it to the console. The writing to the console is then picked up as an event by the newman library
						activities_array.push('"'.concat(columns_array.join('","'),'"')); 
						
					};

				};
			}
		}).on('console', function (err, args)
		{
			if (err) { return; }
			if (args.level==='error')
			{ 
				// an error occurred, we shall capture it
				newmanconsoleerrors.push(args.messages[0])
			};
			if ((args.level==='log')  && (newman_reporter_cli_silent===false))
			{ 
				console.log(args.messages[0]);
			}
			else if (display_requests) {console.log(args.messages)}	
		}).on('done', function (err, summary)
		{
			const data_exists=activities_array.length ? true: false;
			if (err || summary.error || (summary.run.failures.length!=0))
			{ 
				console.error('Unable to proceed. A failure occurred whilst running this sample script');
				process.exitCode = 1;
			}
			else if (!data_exists)
			{
				console.log("There are no Acitivity Logs to download. Try again later.");
				process.exitCode = 1;
			}
			else
			{   
				// we have some data back
				// the activities_array has a header row so we shouldn't count that as an activity entry
				console.log((activities_array.length)+' activities downloaded successfully. Creating file(s)...');
				
				let a_file_has_been_written = false;
				
				// a few functions to help determine the current week
				Date.prototype.getWeek = function()
				{
					let date = new Date(this.getTime());
					date.setHours(0, 0, 0, 0);
					// Thursday in current week decides the year.
					date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
					// January 4 is always in week 1.
					let week1 = new Date(date.getFullYear(), 0, 4);
					// Adjust to Thursday in week 1 and count number of weeks from date to week1.
					return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
				}

				// Returns the four-digit year corresponding to the ISO week of the date.
				Date.prototype.getWeekYear = function() {
					let date = new Date(this.getTime());
					date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
					return date.getFullYear();
				}

				// data comes back in time order thanks to the Postman parameter sortDescending set to false, for the All Activities Log POST request
				// the time order is critical to the function of this script
				// all dates have already been processed for any timezone changes
				// we shall not make any changes to these dates as that will confuse things and makes troubleshooting even more problematic
				let oldest_date = new Date(activities_array[0].split('","')[7]);
				let latest_date = new Date(activities_array[activities_array.length-1].split('","')[7]);
				
				oldest_date=new Date(oldest_date.getFullYear().toString().concat(".",("0"+(oldest_date.getMonth()+1)).slice(-2),".",("0"+oldest_date.getDate()).slice(-2),
																						" ",("0"+oldest_date.getHours()).slice(-2),
																						":",("0"+oldest_date.getMinutes()).slice(-2),
																						":",("0"+oldest_date.getSeconds()).slice(-2 )));

				latest_date=new Date(latest_date.getFullYear().toString().concat(".",("0"+(latest_date.getMonth()+1)).slice(-2),".",("0"+latest_date.getDate()).slice(-2),
																						" ",("0"+latest_date.getHours()).slice(-2),
																						":",("0"+latest_date.getMinutes()).slice(-2),
																						":",("0"+latest_date.getSeconds()).slice(-2 )));
				
				const todays_date = new Date();
				todays_date.setMinutes(todays_date.getMinutes() + todays_date.getTimezoneOffset() + TimeZoneMinutes );
				let todays_date_my_timezone= new Date(todays_date.getFullYear().toString().concat(".",("0"+(todays_date.getMonth()+1)).slice(-2),".",("0"+todays_date.getDate()).slice(-2) ));
				
				
				
				switch (option)
				{
					case 'all':
					{
						const first_date_time   =oldest_date.getFullYear().toString().concat("_",("0"+(oldest_date.getMonth()+1)).slice(-2),
																						"_",("0"+oldest_date.getDate()).slice(-2),
																						"_",("0"+oldest_date.getHours()).slice(-2),
																						"_",("0"+oldest_date.getMinutes()).slice(-2),
																						"_",("0"+oldest_date.getSeconds()).slice(-2) )
						
						const lastest_date_time= latest_date.getFullYear().toString().concat("_",("0"+(latest_date.getMonth()+1)).slice(-2),
																						"_",("0"+latest_date.getDate()).slice(-2),
																						"_",("0"+latest_date.getHours()).slice(-2),
																						"_",("0"+latest_date.getMinutes()).slice(-2),
																						"_",("0"+latest_date.getSeconds()).slice(-2) )
						

						const data_filename = (use_fixed_filename) ? fixed_filename : base_filename.concat(first_date_time,'_to_',lastest_date_time,'.csv');
						const entries_in_data_file=activities_array.length;
						// add the header row to the top of the array
						activities_array.splice(0,0,header_row);
						
						filesystem.writeFile(folder.concat(data_filename), activities_array.join("\r\n"), error =>
						{
							if (error) { console.error('Unable to write file '+data_filename+'. error:'+error);
							process.exitCode = 1;											}
						});
						console.log('Written file '+data_filename+' with '+entries_in_data_file+' entries');
						
						a_file_has_been_written=true;
						
						
						
						break;
					} // end all
					
					case 'oldestday':
					case 'lastfullday':
					case 'eachfullday':
					case 'currentday':
					{
						// grab the first date (which is already in the right timezone)
						let current_day_date=new Date(oldest_date);
						let current_day_logs_array=[];

						for (let log_entry=0; log_entry < activities_array.length; log_entry++)
						{
							let end_of_this_period=false;
							let day_this_entry = new Date(activities_array[log_entry].split('","')[7]);
							
							
							if ( (current_day_date.getFullYear() === day_this_entry.getFullYear()  )
							  && (current_day_date.getMonth() === day_this_entry.getMonth())
							  && (current_day_date.getDate() === day_this_entry.getDate()  	 ) )
							{
								// same day we are processing so just add this entry to the current_day_logs_array
								current_day_logs_array.push(activities_array[log_entry]);
								
								if (log_entry===activities_array.length-1)
								{
									// we are on the last entry of the data.

									switch (option)
									{
										case 'currentday':
										{
											end_of_this_period= true
											break;
										}
										default:
										{
											// we need to write the data out if and only if the day is different from todays date
											if ( (todays_date_my_timezone.getFullYear() != day_this_entry.getFullYear()  )
											  || (todays_date_my_timezone.getMonth()    != day_this_entry.getMonth())
											  || (todays_date_my_timezone.getDate()     != day_this_entry.getDate()  	 ) )
											{
												end_of_this_period= true;
											}
											break;
										}
									}; // end switch option
								}; // end if log entry is the last or not
							}
							else
							{
								// different day
								end_of_this_period= true;					
							} // end if day is the same or not
							
							if (end_of_this_period)
							{
								
								let write_this_period_data_to_file=true
								switch (option)
								{
									

									// we should not write the current_day_logs_array for some of the options
									case 'lastfullday':
									{							  
										
										if (     (oldest_date.getFullYear() != current_day_date.getFullYear()  )
											  || (oldest_date.getMonth()    != current_day_date.getMonth())
											  || (oldest_date.getDate()     != current_day_date.getDate()  	 ) )					
										{
											let lastfullday = new Date();
				
											lastfullday.setMinutes(lastfullday.getMinutes() + lastfullday.getTimezoneOffset() + TimeZoneMinutes );
											lastfullday.setDate(lastfullday.getDate()-periods);
											let lastfullday_my_timezone= new Date(lastfullday.getFullYear().toString().concat(".",("0"+(lastfullday.getMonth()+1)).slice(-2),".",("0"+lastfullday.getDate()).slice(-2) ));
											
											if (     (lastfullday_my_timezone > current_day_date  )  )											  
											{
												// the lastfullday date is more recent than the current_day_date, so we don't want to write out a data file
												write_this_period_data_to_file=false;
											}
											
										}
										else
										{
											// the oldest_date is the same as the current_day_date so we should not write this out, as the oldest_date can't be complete
											write_this_period_data_to_file=false;
										}
										break;
									}
									case 'oldestday':
									{
										if (     (oldest_date.getFullYear() != current_day_date.getFullYear()  )
											  || (oldest_date.getMonth()    != current_day_date.getMonth())
											  || (oldest_date.getDate()     != current_day_date.getDate()  	 ) )					
										{
											// the oldest_date is not the same as the current_day_date we have data for, so we shouldn't write this data out
											write_this_period_data_to_file=false;
										}									
										break;								
									}
									case 'currentday':
									{
										if (     (current_day_date.getFullYear() != day_this_entry.getFullYear()  )
											  || (current_day_date.getMonth()    != day_this_entry.getMonth())
											  || (current_day_date.getDate()     != day_this_entry.getDate()  	 ) )					
										{
											// the day_this_entry is not the current day
											write_this_period_data_to_file=false;										
										};
										break;
									}
									case 'eachfullday':
									{
										if (     (oldest_date.getFullYear() != current_day_date.getFullYear()  )
											  || (oldest_date.getMonth()    != current_day_date.getMonth())
											  || (oldest_date.getDate()     != current_day_date.getDate()  	 ) )					
										{
											// nothing
										}
										else
										{
											// the oldest_date is the same as the current_day_date so we should not write this out, as the oldest_date can't be complete
											write_this_period_data_to_file=false;
										}
										break;
									}
								}
										
								if (write_this_period_data_to_file)
								{

									const this_day_YYYY_MM_DD=current_day_date.getFullYear().toString().concat("_",("0"+(current_day_date.getMonth()+1)).slice(-2),"_",("0"+current_day_date.getDate()).slice(-2))

									let   data_filename = base_filename.concat('YMD_',this_day_YYYY_MM_DD);
									switch (option)
									{
										// the filename needs to be different to reflect the contents of the file
										// a _tail means it read at least one entry for that period, but we can't be certain it got the first entry without an entry on the previous period
										// a _head is when the period includes today and it can't be complete until tomorrow!
										case 'oldestday':
										{
											data_filename = data_filename.concat('_tail');
											break;
										}
										case 'lastfullday':
										case 'eachfullday':
										{
											data_filename = data_filename.concat('_full');
											break;
										}
										case 'currentday':
										{
											data_filename = data_filename.concat('_head');
											break;
										}
									};
									data_filename = data_filename.concat('.csv');
									const entries_in_data_file=current_day_logs_array.length;
									current_day_logs_array.splice(0,0,header_row);
									if (use_fixed_filename && periods===1) { data_filename=fixed_filename };
									
									filesystem.writeFile(folder.concat(data_filename), current_day_logs_array.join("\r\n"), error =>
									{
										if (error) { console.error('Unable to write file '+data_filename+'. error:'+error);
										process.exitCode = 1;											}
									});
									console.log('Written file '+data_filename+' with '+entries_in_data_file+' entries');
									
									a_file_has_been_written=true;
								}
								// we need to empty the current_day_logs_array to start to process the next days logs
								current_day_logs_array=[];
								// we need to push the current entry to the array as we're now on a different day
								current_day_logs_array.push(activities_array[log_entry]);
								// and update the current_day_date to the new date we're now on
								current_day_date=day_this_entry;	
							}
							 
						} // end loop

						break;
					}; // end case eachfullday
					
					
					
					
					case 'oldestweek':
					case 'lastfullweek':
					case 'eachfullweek':
					case 'currentweek':
					{
						let current_day_date=new Date(oldest_date);
					
						let current_week	=current_day_date.getWeek();
						let current_weekyear=current_day_date.getWeekYear();
						
						// set the current_day_date and todays_date_my_timezone to be the first day of their respective weeks
						current_day_date.setDate( current_day_date.getDate()- (current_day_date.getDay() +6) % 7 );
						todays_date_my_timezone.setDate( todays_date_my_timezone.getDate()- (todays_date_my_timezone.getDay()+6) % 7 );  // get the first day of the week
						let current_week_logs_array=[];
						
						for (let log_entry=0; log_entry < activities_array.length; log_entry++)
						{
							let end_of_this_period=false;
							
							let day_this_entry = new Date(activities_array[log_entry].split('","')[7]);
							const week_this_entry = day_this_entry.getWeek();
							const weekyear_this_entry = day_this_entry.getWeekYear();

							if ( (current_week     === week_this_entry )
							  && (current_weekyear === weekyear_this_entry   )  )
							{
								// same week, same year
								current_week_logs_array.push(activities_array[log_entry]);
								
								if (log_entry===activities_array.length-1)
								{
									// we are on the last entry of the data.
									
									switch (option)
									{
										case 'currentweek':
										{
											end_of_this_period= true
											break;
										}
										default:
										{
											// we need to write the data out if an only if the week is different from todays week
											if (  (todays_date_my_timezone.getWeekYear() != weekyear_this_entry )
											   || (todays_date_my_timezone.getWeek()     != week_this_entry)      )
											{
												end_of_this_period= true;
											};
											break;
										}
									}
								};
							}
							else
							{
								end_of_this_period= true;					
							} // end if week is the same or not
							
							if (end_of_this_period)
							{
								let write_this_period_data_to_file=true
								switch (option)
								{
									case 'lastfullweek':
									{
										if (     (oldest_date.getWeekYear() != current_weekyear )
											  || (oldest_date.getWeek()     != current_week     )     )					
										{
											let lastfullweek = new Date();
											
											lastfullweek.setMinutes(lastfullweek.getMinutes() + lastfullweek.getTimezoneOffset() + TimeZoneMinutes );
											lastfullweek.setDate(lastfullweek.getDate()- (lastfullweek.getDay()+6) % 7 );
											lastfullweek.setDate(lastfullweek.getDate()- (7*periods) );	
											let lastfullweek_my_timezone= new Date(lastfullweek.getFullYear().toString().concat(".",("0"+(lastfullweek.getMonth()+1)).slice(-2),".",("0"+lastfullweek.getDate()).slice(-2) ));
											if (     (lastfullweek_my_timezone> current_day_date  )		)		
											{
												write_this_period_data_to_file=false;
											};
										}
										else
										{
											write_this_period_data_to_file=false;
										}
										
										break;
									}
									case 'oldestweek':
									{
										if (     (oldest_date.getWeekYear() != current_weekyear  )
											  || (oldest_date.getWeek()     != current_week ) )					
										{
											// the week_this_entry is not the oldest week
											write_this_period_data_to_file=false;
										}
										break;
									}
									case 'currentweek':
									{
										if (     (current_weekyear != weekyear_this_entry  )
											  || (current_week     != week_this_entry ) )					
										{
											// the week_this_entry is not the current week
											write_this_period_data_to_file=false;
										}
										break;
									}
									case 'eachfullweek':
									{
										if (     (oldest_date.getWeekYear() != current_weekyear )
											  || (oldest_date.getWeek()     != current_week     )     )					
										{
											// nothing
										}
										else
										{
											write_this_period_data_to_file=false;
										}
										break;
									}
								}
								
								
								
								if (write_this_period_data_to_file)
								{
									let data_filename = base_filename.concat('YWk_',current_weekyear,'_',current_week);
									switch (option)
									{
										case 'oldestweek':
										{
											data_filename = data_filename.concat('_tail');
											break;
										}
										case 'lastfullweek':
										case 'eachfullweek':
										{
											data_filename = data_filename.concat('_full');
											break;
										}
										case 'currentweek':
										{
											data_filename = data_filename.concat('_head');
											break;
										}
									};
									data_filename = data_filename.concat('.csv');
									const entries_in_data_file=current_week_logs_array.length;
									current_week_logs_array.splice(0,0,header_row);
									if (use_fixed_filename && periods===1) { data_filename=fixed_filename };
									
									filesystem.writeFile(folder.concat(data_filename), current_week_logs_array.join("\r\n"), error =>
									{
										if (error) { console.error('Unable to write file '+data_filename+'. error:'+error);
										process.exitCode = 1;											}
									});
									console.log('Written file '+data_filename+' with '+entries_in_data_file+' entries');
									
									a_file_has_been_written=true;
								};
								
								current_week_logs_array=[];
								current_week_logs_array.push(activities_array[log_entry]);
								current_week	=week_this_entry;
								current_weekyear=weekyear_this_entry;
								current_day_date=day_this_entry;
							}
							 
						} // end loop

						break;
					}; // end case eachfullweek
					
					case 'oldestmonth':
					case 'lastfullmonth':
					case 'eachfullmonth':
					case 'currentmonth':
					{
						
						let current_day_date=new Date(oldest_date);
						let current_month	=current_day_date.getMonth();
						let current_year 	=current_day_date.getFullYear();

						let current_month_logs_array=[];
						
						for (let log_entry=0; log_entry < activities_array.length; log_entry++)
						{
							let end_of_this_period=false;
							let day_this_entry    = new Date(activities_array[log_entry].split('","')[7]);
							const month_this_entry= day_this_entry.getMonth();
							const year_this_entry = day_this_entry.getFullYear();

							if ( (current_month  === month_this_entry )
							  && (current_year   === year_this_entry   )  )
							{
								// same month, same year
								current_month_logs_array.push(activities_array[log_entry]);
								
								if (log_entry===activities_array.length-1)
								{
									// we are on the last entry of the data.
									switch (option)
									{
										case 'currentmonth':
										{
											end_of_this_period= true
											break;
										}
										default:
										{
											// we need to write the data out if an only if the month is different from todays month
											if (  (todays_date_my_timezone.getFullYear() != year_this_entry )
											   || (todays_date_my_timezone.getMonth()    != month_this_entry)  )
											{
												end_of_this_period= true;
											}
											break;
										}
									}
								}
							}
							else
							{
								// different month
								end_of_this_period= true;					
							} // end if week is the same or not
							
							if (end_of_this_period)
							{
								
								let write_this_period_data_to_file=true
								switch (option)
								{
									case 'lastfullmonth':
									{
										if (     (oldest_date.getFullYear() != current_year  )
											  || (oldest_date.getMonth()    != current_month )	)				
										{
											let lastfullmonth = new Date();
											lastfullmonth.setMinutes(lastfullmonth.getMinutes() + lastfullmonth.getTimezoneOffset() + TimeZoneMinutes );
											lastfullmonth.setMonth(lastfullmonth.getMonth()-periods);	
											let lastfullmonth_my_timezone= new Date(lastfullmonth.getFullYear().toString().concat(".",("0"+(lastfullmonth.getMonth()+1)).slice(-2),".01"));
											
											if (     (lastfullmonth_my_timezone> current_day_date)	 ) 					
											{
												// the month_this_entry is not last month
												write_this_period_data_to_file=false;
											};
										}
										else
										{
											write_this_period_data_to_file=false;
										}
										
										break
									}
									case 'oldestmonth':
									{
										if (     (oldest_date.getFullYear() != current_year  )
											  || (oldest_date.getMonth()    != current_month ) )					
										{
											// the month_this_entry is not the oldest month
											write_this_period_data_to_file=false;
										};
										break;
									}
									case 'currentmonth':
									{
										if (     (current_year != year_this_entry  )
											  || (current_month!= month_this_entry ) )					
										{
											// the month_this_entry is not the current month
											write_this_period_data_to_file=false;
										}
										break
									}
									case 'eachfullmonth':
									{
										if (     (oldest_date.getFullYear() != current_year  )
											  || (oldest_date.getMonth()    != current_month )	)				
										{
											// nothing
										}
										else
										{
											write_this_period_data_to_file=false;
										}
										break;
									}
								}
								
								
								if (write_this_period_data_to_file)
								{
									let data_filename = base_filename.concat('YM_',current_year.toString(),'_',(current_month+1).toString());
									switch (option)
									{
										case 'oldestmonth':
										{
											data_filename = data_filename.concat('_tail');
											break;
										}
										case 'lastfullmonth':
										case 'eachfullmonth':
										{
											data_filename = data_filename.concat('_full');
											break;
										}
										case 'currentmonth':
										{
											data_filename = data_filename.concat('_head');
											break;
										}
									};
									data_filename = data_filename.concat('.csv');
									const entries_in_data_file=current_month_logs_array.length;
									current_month_logs_array.splice(0,0,header_row);
									if (use_fixed_filename && periods===1) { data_filename=fixed_filename };
									
									filesystem.writeFile(folder.concat(data_filename), current_month_logs_array.join("\r\n"), error =>
									{
										if (error) { console.error('Unable to write file '+data_filename+'. error:'+error);
										process.exitCode = 1;											}
									});
									console.log('Written file '+data_filename+' with '+entries_in_data_file+' entries');
									
									a_file_has_been_written=true;
								}
								current_month_logs_array=[];
								current_month_logs_array.push(activities_array[log_entry]);
								current_month=month_this_entry;
								current_year=year_this_entry;
								current_day_date=day_this_entry;
							}
							 
						} // end loop

						break;
					}; // end case eachfullweek
				}; // end switch case option
				
				if (!a_file_has_been_written)
				{
					// to help confusion why some logs are written or not...
					console.warn('No activity logs found that matches your request.');
					console.log();
					switch (option)
					{
						case 'oldestday':
						{
							console.log('\''+option+'\' requires at least 2 days\' worth of activities, otherwise it can\'t determine if that 1st day has completed or not.');
							console.log('Use \'currentday\' instead');
							console.log();
							break;
						}
						case 'lastfullday':
						{
							let lastfullday = new Date();
							lastfullday.setMinutes(lastfullday.getMinutes() - lastfullday.getTimezoneOffset() + TimeZoneMinutes);
							
							if (     (oldest_date.getFullYear() != lastfullday.getFullYear()  )
								  || (oldest_date.getMonth()    != lastfullday.getMonth())
								  || (oldest_date.getDate()     != lastfullday.getDate()  	 ) )					
							{
								console.log('\''+option+'\' requires activities that occurred yesterday.');
								console.log();
								console.log('Requesting activity log downloads is a recorded activity, so running this each day will result in a file per day.');
								console.log();
							}
							else
							{
								console.log('\''+option+'\' requires activities that occurred before, during and since this period.');
								console.log();
								console.log('Requesting activity log downloads is a recorded activity, so running this each day will result in a file per day.');
								console.log('Use \'oldestday\', \'eachfullday\' and \'currentday\' instead for now.');
								console.log();
							};						
							break;
						}
						case 'eachfullday':
						{
							console.log('\''+option+'\' requires at least 3 days\' worth of activities, otherwise it can\'t determine if the 2nd day has completed or not.');
							console.log('Use \'oldestday\' and \'currentday\' instead.');
							console.log();
							break;
						}
						case 'oldestweek':
						{
							console.log('\''+option+'\' requires at least 2 weeks\' worth of activities, otherwise it can\'t determine if that 1st week has completed or not.');
							console.log('Use \'currentweek\' instead.');
							console.log();
							break;
						}
						case 'lastfullweek':
						{
							console.log('\''+option+'\' requires activities that occurred before, during and since this period.');
							console.log();
							console.log('Requesting activity log downloads is a recorded activity, so running this each week will result in a file per week.');
							console.log('Use \'oldestweek\', \'eachfullweek\' and \'currentweek\' instead for now.');
							console.log();
							break;
						}
						case 'eachfullweek':
						{
							console.log('\''+option+'\' requires at least 3 weeks\' worth of activities, otherwise it can\'t determine if the 2nd week has completed or not.')
							console.log('Use \'oldestweek\' and \'currentweek\' instead.');
							console.log();
							break;
						}
						case 'oldestmonth':
						{
							console.log('\''+option+'\' requires at least 2 months\' worth of activities, otherwise it can\'t determine if that 1st month has completed or not.');
							console.log('Use \'currentmonth\' instead.');
							console.log();
							break;
						}
						case 'lastfullmonth':
						{
							console.log('\''+option+'\' requires activities that occurred before, during and since this period.');
							console.log();
							console.log('Requesting activity log downloads is a recorded activity, so running this each month will result in a file per month.');
							console.log('Use \'oldestmonth\', \'eachfullmonth\' and \'currentmonth\' instead for now.');
							console.log();
							break;
						}
						case 'eachfullmonth':
						{
							console.log('\''+option+'\' requires at least 3 months\' worth of activities, otherwise it can\'t determine if the 2nd month has completed or not.');
							console.log('Use \'oldestmonth\' and \'currentmonth\' instead.');
							console.log();
							break;
						}
					}
					
					if (filter_from==='')
					{
						console.log('Oldest log entry found was for '+oldest_date);
						console.log();
						let first_entry=activities_array[0].split('","');
						let object_type=first_entry[0];
						let object_name=first_entry[2];
						let description=first_entry[3];
						let user_name  =first_entry[4];
						let activity   =first_entry[5];
						if ( object_type==='Activity Log' && object_name==='AUDIT' && activity==='Delete')
						{
							// first (oldest) entry was an entry that deleted the logs. This is handy to know and may resolve some confusion, so lets share this now
							console.log('Activity logs were manually deleted by '+user_name+' on '+oldest_date+' for the period: '+description+' (for time zone that isn\'t recorded but would had been the time zone of the browser used)');
						}
						else 
						{
							// the oldest entry isn't a delete logs entry, so either the logs have never been deleted, or they are being automatically deleted by SAP
							console.log('Activity logs have not been manually deleted.');
							console.log('Oldest logs are automatically deleted by SAP.');
							console.log('See https://help.sap.com/docs/SAP_ANALYTICS_CLOUD/00f68c2e08b941f081002fd3691d86a7/8f02122ccdda4c14a1bdaee5a5cf4c9b.html for more details');
						}; // end if the oldest entry was a delete logs entry or not
					}
					
				}
				else	
				{
					console.log();
					console.log('Activity logs contain personal data. Ensure you comply with local laws and secure this data appropriately');
					console.log();
				}; // end if a_file_has_been_written
			}; // end if error or not
		}); // end newman.run

	} // end try newman.run
	catch (err)
	{
		console.error("Error : ",err);
		process.exitCode = 1;
	}
}; // end if valid_options
