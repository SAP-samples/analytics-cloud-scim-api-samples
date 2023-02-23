//
//
//
//
//  Sample script to download the activities log from SAP Business Technology Platform
//  This sample is provided 'as is'
//
//  Developed by Matthew Shaw, SAP https://people.sap.com/matthew.shaw/#content:blogposts
//
//	Version 0.8
//  February 2023
//
//
//  For full step-by-step instructions please visit the blog and download the user guide
//
//  Blog: https://blogs.sap.com/2023/02/23/sap-business-technology-platform-audit-logs-command-line-interface-cli-to-automate-downloads-plus-associated-best-practices-and-faqs/
//  User Guide: https://d.dam.sap.com/a/vfjnhzM/ 

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
//  It is this environment that points to an OAuth client in SAP BTP. If you have multiple SAP BTP subaccounts, you'll need to
//  duplicate this script, one for each subaccount. Each script will have a different subaccount and a different friendly_service_name (set above)
const environment 	= "./BTP environment.postman_environment.json";

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
let   base_filename = "AuditLog";

//
//
//  if you'd prefer to use a non-dynamic filename, then you can opt for a fixed filename by changing this setting to true
//  however it is only applicable if the option is either 'all' or 'lastfullday, lastfullweek or lastfullmonth' with the periods set to 1
const use_fixed_filename = false;
//
//  and if use_fixed_filename is true, then the fixed_filename can be defined here
const fixed_filename = "AuditLog";


//
//  create json file or not. Both generate_json_file and generate_csv_file can be true
const generate_json_file = true;

// create a csv file or not. Both generate_json_file and generate_csv_file can be true
const generate_csv_file  = true;

// the csv file delimiter
const csv_file_delimiter = "#";  // default #
// the csv file is actually separated by a # rather than a comma (,) because the data itself contains commas! 
// feel free to change this if you would like to.

const add_microsoft_excel_sep_equals_to_top_of_file = true;  // default true
// adds, for example 'sep=#' to the top of the .csv file. It enables Microsoft Excel to open the file and know how the file columns are separated

const dynamically_parse_json_message_and_update_non_standard_column_headers = true;  //default true
// this means dynmically parse the message column, which is a json object, to identify all the individual properties within it. Each property then becomes a column in the csv
// you can disable this feature (set to false) and it will speed up the file generation, however you run the chance of missing new properties that come along over time

const remove_parents_of_non_standard_column_headers = true; // default true
// the parents of the nested json are often not needed, if all the children are already shown. So, often removing the parents makes sense.

const do_not_remove_message_column_header_regardless_of_other_settings = true; // default true
// Whilst removing parent columns makes sense, this could be dangerous when new properties come along that are not expected.
// when this occurs you could be missing these extra properties. So, keeping the full parent 'message' solves this problem and means you've always got a true copy of everything
// that was captured and nothing has been removed from it.

const place_standard_headers_first_then_after_non_standard_column_headers_sorted = true; // default true
// when the columns are dynamically determined, this can often result in an annoying order! This setting solves that problem by sorting all the non-standard column headers
// (i.e. the headers derived from the nested json), so they are nicely ordered

const filename_to_store_column_headers="./column_headers.json"; // default "./column_headers.json"
// column headers are stored in this file. This allows you to edit which columns you don't necessarily need or want or re-order as you see fit.
// storing them in a file means, the number of columns won't shrink just because the data is no longer present in the audit logs.
// And we don't want the columns to shrink because something that is reading them may complain of missing columns


const NEO_try_to_find_JSON_attribute_name_if_missing=true;  // default true
// on NEO the 'Message' value as a whole is not valid JSON, but it contains amongst the text, valid JSON
// Since this Message is poorly formed, during the exaction for valid JSON, an attempt is made to identify the ‘name’ for the JSON ‘value’
// this setting enables an attempt to get the name preceeding the JSON value.
// The text preceding the JSON and between the first two quotes (“) is used, with spaces replaced by underscores (_)

//
//
//  As each request to the SAP BTP API is made, that request can be displayed to the console.
//	This can be helpful to see the progress when the download takes a long time, or if the download fails for some reason
//  The amount of console logging, when set to true, is very low and quite safe to leave enabled
//  The default is 'true' but feel free to set this to 'false' to enable a more silent run
const display_requests = true;

//
//
//  The name of the Postman collection. This is unlikely to change
const collection_name="./BTP Audit 4202-All-Es-Download All Audit Logs (nodejs).postman_collection.json";

//
//
//  if false then the postman console logs AND all requests are written to the main console making this slightly more verbous logging.
//  The default is 'true' but if you want to troubleshoot, then set this to 'false'
const newman_reporter_cli_silent = true;
//
//
//


//  Looking for where to specify the Time Zone? or the BTP Service friendly name? The please edit the Postman Environment.json as these are defined there




//
//
//	In general please do not edit below this line
//
//
//
const postman_environment = require(environment);	// load the environment as we need to read some of the values from there, namely timezone and BTP service friendly name
const postman_environment_variable_values=postman_environment.values
let   postman_environment_variable_TimeZoneHours  =postman_environment_variable_values.find( entry => entry.key==='TimeZoneHours'   && entry.enabled===true );
let   postman_environment_variable_TimeZoneMinutes=postman_environment_variable_values.find( entry => entry.key==='TimeZoneMinutes' && entry.enabled===true );


const postman_environment_variable_BTPservicefriendlyname = postman_environment_variable_values.find( entry => entry.key==='BTPservicefriendlyname' && entry.enabled===true );
const postman_environment_variable_BTPserviceFQDN         = postman_environment_variable_values.find( entry => entry.key==='BTPserviceFQDN'  && entry.enabled===true ).value;

const friendly_service_name = postman_environment_variable_BTPservicefriendlyname === undefined ?
		(postman_environment_variable_BTPserviceFQDN.substring(0, postman_environment_variable_BTPserviceFQDN.indexOf("."))) : postman_environment_variable_BTPservicefriendlyname.value;
		
base_filename = base_filename.concat("_",friendly_service_name,"_");

// test if the variables exist or not.
// for the postman_environment_variable_TimeZoneMinutes, if the variable is missing we shall use the local timezone, so we shall grab the TimezoneOffset
postman_environment_variable_TimeZoneHours   = postman_environment_variable_TimeZoneHours  ===undefined ? 0 : parseInt(postman_environment_variable_TimeZoneHours.value);
postman_environment_variable_TimeZoneMinutes = postman_environment_variable_TimeZoneMinutes===undefined ? -(new Date().getTimezoneOffset()) : parseInt(postman_environment_variable_TimeZoneMinutes.value);
// we shall store the total number of minutes in a single variable TimeZoneMinutes
// this TimeZoneMinutes will be used when we create a new date based off todays date as we'll need to adjust that date to be the right timezone for the comparisions of date parts (date, month, year).
let TimeZoneMinutes = postman_environment_variable_TimeZoneMinutes + (postman_environment_variable_TimeZoneHours * 60);

const postman_environment_variable_BTPplatform = postman_environment_variable_values.find( entry => entry.key==='BTPplatform' && entry.enabled===true );
const BTP_Platform   = (postman_environment_variable_BTPplatform  ===undefined) ? 'CF' : postman_environment_variable_BTPplatform.value;
const message_identifier = (BTP_Platform==='CF') ? 'message' : 'Message';

const default_NEO_audit_log_retention_duration_days=210;
const postman_environment_variable_BTPAuditLogRetentionDurationInDays = postman_environment_variable_values.find( entry => entry.key==='BTPAuditLogRetentionDurationInDays' && entry.enabled===true );
const DefaultAuditLogRetentionDurationInDays = (BTP_Platform==='CF') ? 90 : default_NEO_audit_log_retention_duration_days;
let   AuditLogRetentionDurationInDays = (postman_environment_variable_BTPAuditLogRetentionDurationInDays===undefined) ? DefaultAuditLogRetentionDurationInDays : parseInt(postman_environment_variable_BTPAuditLogRetentionDurationInDays.value);
let   time_identifier=(BTP_Platform==='CF') ? 'time' : 'Time';



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
	console.log('Downloads the Audit Logs from SAP Business Technology Platform and creates one or multiple .csv/.json files');
	console.log();
	console.log('Usage : node nodejs_9101_download_btp_audit_logs.js option [lastperiods]');
	console.log();
	console.log('option:');
	console.log();
	console.log('        help : displays this help description');
	console.log();
	console.log('         all : all audit logs & creates a single file e.g. '+base_filename+'2022_04_20_06_22_to_2022_11_29_07_28');
	console.log();
	console.log('  oldestday  : first, likely incomplete, day & creates a single file                e.g. '+base_filename+'YMD_2022_04_20_tail');
	console.log('  eachfullday: creates a file for each day that has a complete set of audit logs    e.g. '+base_filename+'YMD_2022_04_21_full ...');
	console.log('  lastfullday: yesterday\'s aduit logs & creates a single file (run daily)           e.g. '+base_filename+'YMD_2022_11_29_full');
	console.log('  currentday : today\'s aduit logs so far, so incomplete, & creates a single file    e.g. '+base_filename+'YMD_2022_11_30_head');
	console.log();
	console.log('  oldestweek  : first, likely incomplete, week & creates a single file                 e.g. '+base_filename+'YWk_2022_16_tail');
	console.log('  eachfullweek: creates a file for each week that has a complete set of audit logs     e.g. '+base_filename+'YWk_2022_17_full ...');
	console.log('  lastfullweek: last week\'s aduit logs & creates a single file (run weekly)            e.g. '+base_filename+'YWk_2022_46_full');
	console.log('  currentweek : this week\'s aduit logs so far, so incomplete, & creates a single file  e.g. '+base_filename+'YWk_2022_47_head');
	console.log();
	console.log('  oldestmonth  : first, likely incomplete, month & creates a single file                e.g. '+base_filename+'YM_2022_04_tail');
	console.log('  eachfullmonth: creates a file for each month that has a complete set of audit logs    e.g. '+base_filename+'YM_2022_05_full ...');
	console.log('  lastfullmonth: last month\'s aduit logs & creates a single file (run monthly)          e.g. '+base_filename+'YM_2022_10_full');
	console.log('  currentmonth : this month\'s aduit logs so far, so incomplete, & creates a single file e.g. '+base_filename+'YM_2022_11_head');
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
	// the script works by processing each line/row/entry of the audit log, line by line. It is the changing of the date between one row and the next
	// that determines if a period of time (day, week, month) is complete or not (full or not). So any filter needs to bring back more data to allow for this 
	// to occur. Hence the filters on dates are much longer than you may think are necessary and it allows for many days where there may not be any activity at all
	// If the filter_from variable is passed into Postman and it is used in the 'body' of the request.

	const filter_from_date = new Date();  // no need to change timezone offset as this must be in GMT as the API only works in GMT
	filter_from_date.setMinutes(filter_from_date.getMinutes() - filter_from_date.getTimezoneOffset());  // this is to set the date to be GMT, the same time zone as used in the Activities log
	let filter_from='';
	let midnight_time_filter_value = (BTP_Platform==='NEO') ? 'T00.00.00' :	'T00:00:00';
	
	switch (option)
	{
		case 'lastfullday':
		case 'currentday':
		{
			// set the filter to be 6 days before, just to be on the safe side
			// We need to getMonth()+1 because January is 0 so this makes January a 1.
			filter_from_date.setDate(filter_from_date.getDate()-(periods+6));
			filter_from=filter_from_date.getFullYear().toString().concat('-',("0"+(filter_from_date.getMonth()+1)).slice(-2),'-',("0"+filter_from_date.getDate()).slice(-2),midnight_time_filter_value)
			break;
		}
		case 'lastfullweek':
		case 'currentweek':
		{
			// set the filter to be 10 days after plus a week, just to be on the safe side
			// We need to getMonth()+1 because January is 0 so this makes January a 1.
			filter_from_date.setDate(filter_from_date.getDate()-(periods*7+10));
			filter_from=filter_from_date.getFullYear().toString().concat('-',("0"+(filter_from_date.getMonth()+1)).slice(-2),'-',("0"+filter_from_date.getDate()).slice(-2),midnight_time_filter_value)
			break;
		}
		case 'lastfullmonth':
		case 'currentmonth':
		{
			// set the filter to be 23rd day one months ago. This allows for some activity between 23rd of that month and the end of that month to allow the script to determine
			// the next month (last month) is a complete 'full' months worth of activity logs. We need to getMonth()+1 because January is 0 so this makes January a 1.
			filter_from_date.setMonth(filter_from_date.getMonth()-(periods+1));
			filter_from=filter_from_date.getFullYear().toString().concat('-',("0"+(filter_from_date.getMonth()+1)).slice(-2),"-23",midnight_time_filter_value)
			break;
		}
		default:
		{
			// set the filter to be max retention duration plus and extra 3 days to be on the save side
			// We need to getMonth()+1 because January is 0 so this makes January a 1.
			filter_from_date.setDate(filter_from_date.getDate()-(AuditLogRetentionDurationInDays+3));
			filter_from=filter_from_date.getFullYear().toString().concat('-',("0"+(filter_from_date.getMonth()+1)).slice(-2),'-',("0"+filter_from_date.getDate()).slice(-2),midnight_time_filter_value)
			break;
		}
	}  // end switch option


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
				console.error('The following errors occurred whilst trying to download audit logs from SAP Business Technology Platform:');
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
			console.log('Downloading audit logs from SAP Business Technology Platform...');
		}).on('request', function (err, args) {

			// a request has completed
			const data_returned_in_responseBody_of_Postman_request_position_in_collection = 1;
			
			// if the 2nd request in the collection has completed (has index=1), then this is the request that might hold the data we need
			if (args.cursor.position>=data_returned_in_responseBody_of_Postman_request_position_in_collection)
			{
				// we need to test if the response buffer exists and the response code was a HTTP 200
				var responseBody_buffer = Buffer.from(args.response.stream);
				if (Buffer.isBuffer(responseBody_buffer) && (args.response.code===200) )
				{
					// we have data that we need to store into the variable activities_array
					const audit_log_entry = (BTP_Platform==='CF') ? JSON.parse(responseBody_buffer.toString()) : JSON.parse(responseBody_buffer.toString()).value;  // audit_log_entry is an array, each element is a row

					for (let entry=0; entry<(audit_log_entry.length); entry++)
					{

						let timestamp= (BTP_Platform==='CF') ?
							new Date(audit_log_entry[entry].time)
						  : new Date( audit_log_entry[entry].Time.substr(0,13).concat(':',audit_log_entry[entry].Time.substr(14,2),':',audit_log_entry[entry].Time.substr(17,11) )); 
						
						
						timestamp.setMinutes(timestamp.getMinutes() + TimeZoneMinutes);  // we add (or substract) the minutes depending upon the timezone before we then re-create the timestamp in the correct time zone
						
						audit_log_entry[entry][time_identifier]= timestamp.getFullYear().toString().concat("-",
																				("0"+(timestamp.getMonth()+1)).slice(-2),"-",
																				("0"+ timestamp.getDate()).slice(-2)," ",
																				("0"+ timestamp.getHours()).slice(-2),":",
																				("0"+ timestamp.getMinutes()).slice(-2),":",
																				("0"+ timestamp.getSeconds()).slice(-2),".",
																				("00"+ timestamp.getMilliseconds()).slice(-3)
																				);
					
						
						// add the entry to the beginning of the log, as the data is downloaded in the wrong order! 
						// adding the entry to the beginning of the array, reserves the order for us, so its in the right order for the logic in this script to work.
						
						
						
						if (( BTP_Platform==='NEO') && (dynamically_parse_json_message_and_update_non_standard_column_headers))
						{
							
							function extractJSON(message_string) {
								let firstOpen, firstClose, candidate;
								firstOpen = message_string.indexOf('{', firstOpen + 1);
								do {
									firstClose = message_string.lastIndexOf('}');
									if (firstClose <= firstOpen) {
										return [];
									}
									do {
										candidate = message_string.substring(firstOpen, firstClose + 1);
										try {
											let candidate_constains_json = JSON.parse(candidate);
											// the above may fail, in which case its not valid json. Otherwise it will continue...
											
											// we shall try and see if the text before the opening { has two ". 
											// if it does we shall use the text between " and " as the json attribute name
											// we shall convert any spaces to underscore _ as spaces aren't allowed
											
											if (NEO_try_to_find_JSON_attribute_name_if_missing)
											{
												let name_first_quote=message_string.substring(0,firstOpen).indexOf('"');
												let name_second_quote =message_string.substring(name_first_quote+1,firstOpen).indexOf('"')-1;
												if ((name_first_quote>-1) && (name_second_quote)>-1)
													{
														const possible_name=message_string.substring(name_first_quote+1,name_first_quote+name_second_quote+1+1).replace(/ /g,"_")
														// if the name is valid. Its valid with normal characters only, as well as a _ 
														// if you wanted to add other characters to be included as part of the JSON name then edit the regular expression just below
														if (/^[A-Za-z0-9_]*$/.test(possible_name)){
														candidate_constains_json = JSON.parse('{ "'.concat(possible_name,'": ',candidate,' }'));
													}};
											}// end looking for a possible json attribute name
											
											const myarray=[];
											myarray.push(candidate_constains_json)
											const remainer=extractJSON(message_string.substr(firstClose + 1));
											if (remainer===undefined)
											{ return myarray }
											else { myarray.push(remainer); return myarray }
										}
										catch(e) { // nothing
										}
										firstClose = message_string.substr(0, firstClose).lastIndexOf('}');
									} while (firstClose > firstOpen);
									firstOpen = message_string.indexOf('{', firstOpen + 1);
								} while (firstOpen != -1);
							}
							
							Object.assign(audit_log_entry[entry], {message: JSON.stringify(extractJSON(audit_log_entry[entry].Message))});
							
						}
						activities_array.splice(0,0,audit_log_entry[entry]);
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
			else if (display_requests) {console.log(args.messages[0])}	
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
				console.log("There are no audit logs to download. Try again later.");
				process.exitCode = 1;
			}
			else
			{   
				// we have some data back
				// the activities_array has a header row so we shouldn't count that as an activity entry
				console.log((activities_array.length)+' audit logs downloaded successfully. Creating file(s)...');
				
				const standard_keys= (BTP_Platform==='CF') ?
					['message_uuid','time','tenant','org_id','space_id','app_or_service_id','als_service_id','user','category','format_version','message']
					: ['Uuid','Category','User','Tenant','Account','Application','Time','InstanceId','FormatVersion','Message']; 
				if ( (BTP_Platform==='NEO') && (dynamically_parse_json_message_and_update_non_standard_column_headers))
				{
					standard_keys.push('message');
				}
				let all_message_keys = [];
				
				try {
				  const data = filesystem.readFileSync(filename_to_store_column_headers, 'utf8');
				  all_message_keys = JSON.parse(data)
				} catch (err) {
				  all_message_keys = [].concat(standard_keys);
				};
				
				const column_headers_before_scan=all_message_keys.length;
				if (dynamically_parse_json_message_and_update_non_standard_column_headers)
				{
					activities_array.forEach( audit_log_entry =>
					{ 
						identify_keys( '', audit_log_entry)
					}) // end activities_array.forEach

				}
				
				function identify_keys ( path, message )
				{
					function isValidJSON(string)
					{
						try { JSON.parse(string) }
						catch (error) { return false }
						return true;
					}; // end function isValidJSON
				
				
					path= (path==='') ? '' : path.concat('.');

					if ( typeof (message)=='object') 
					{
						const message_keys_in_this_entry=Object.keys(message);
						
						message_keys_in_this_entry.forEach( key => 
						{
							const message_value=message[key];
						
							if (message_value===null)
							{
								// nothing to do
							}
							else
							{
								if (all_message_keys.includes( path.concat(key) ))
								{
									// already in the list
								}
								else
								{
									// need to add the key into the list
									all_message_keys.push( path.concat(key) );
								}
								
								if (isValidJSON(message_value))
								{
									identify_keys( path.concat(key), JSON.parse(message_value))
								}
								else
								{
									identify_keys( path.concat(key), message_value)
								}
							
								
							}
						}) // end forEach message_keys_in_this_entry
					}							
				}
				
				const message_keys_only=[].concat(all_message_keys.filter( key => {return (!standard_keys.includes(key))}));
				
				message_keys_only.sort();
				
				if (place_standard_headers_first_then_after_non_standard_column_headers_sorted)
				{
					all_message_keys=standard_keys.concat(message_keys_only);
				}
				
				
				
				if (remove_parents_of_non_standard_column_headers)
				{
					for (let header=0; header<all_message_keys.length-1; header++)
					{
						
						if ( (all_message_keys[header])=== (all_message_keys[(header+1)]).substring(0,(all_message_keys[header]).length))
						{
							// current header must be a parent of the next header
							if ((do_not_remove_message_column_header_regardless_of_other_settings) && (all_message_keys[header]===message_identifier))
							{
								// do nothing
							}
							else
							{
								all_message_keys.splice(header,1);
								header--;
							}
						}
						
					}
					
				}
				
				
				if (dynamically_parse_json_message_and_update_non_standard_column_headers)
				{
					const column_headers_after_scan=all_message_keys.length;
					
					if (column_headers_before_scan<column_headers_after_scan)
					{
						console.info('Having traversed the nested json message, '+(column_headers_after_scan-column_headers_before_scan)+' additional column headers have been identified');
						try
						{
							filesystem.writeFileSync(filename_to_store_column_headers, JSON.stringify(all_message_keys,null,4), 'utf8');
							console.info('Updated column headings & saved to '+filename_to_store_column_headers);
						}
						catch(error)
						{
							console.error('Unable to update '+filename_to_store_column_headers+': '+error);
						}
						
					}
				}
				
				header_row=all_message_keys.join(csv_file_delimiter);
				
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
				let oldest_date = new Date(activities_array[0][time_identifier]) 
				let latest_date = new Date(activities_array[activities_array.length-1][time_identifier]);
				
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
				
				
				
				
				
				function Generate_csv_file_contents( myarray )
				{
					function isValidJSON(string) {
							try { JSON.parse(string) }
							catch (error) { return false }
							return true;
						}; // end function isValidJSON
					
					function identify_value ( path_array, message )
						{
							if (message===undefined)
							{
								return ''
							}
							else if ( path_array.length===1)
							{
								const message_value=message[path_array[0]];
								
								if ( message_value === undefined )
								{
									return '';
								}
								else if ( isValidJSON(message_value)) 
								{
									return message_value;
								}
								else if (typeof (message_value) === "object")
								{
									return JSON.stringify(message_value);
								}
								else if (typeof (message_value) === "string")
								{
									return message_value;
								}
								else
								{
									console.warn('Unexpected value: ',message_value);
								}
							}
							else
							{
								let parent=path_array.shift()
								const parent_message_value=message[parent]
								if (typeof (parent_message_value)===undefined)
								{
									console.warn('Unexpected parent value: ',parent_message_value);
									return ''
								}
								else if (isValidJSON(parent_message_value) ) {
									return identify_value( path_array, JSON.parse(parent_message_value))
								}
								else
								{
									return identify_value( path_array, parent_message_value)
								}
							}
							
						}
					
					
					
					let content = myarray.map( GenerateRow );
					function GenerateRow( rowvalue )
					{
						
						return all_message_keys.map( GenerateColumn ).join(csv_file_delimiter);
						function GenerateColumn( columnvalue )
						{
							
							let this_column=identify_value( columnvalue.split('.'), rowvalue )
							return this_column;
						}
					}
					
					content.unshift(header_row);
					if (add_microsoft_excel_sep_equals_to_top_of_file)
					{
						content.unshift('sep='+csv_file_delimiter);
					}
					
					return content.join('\r\n');
					
				}; // end function generate csv file
				
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
						

						const data_filename = (use_fixed_filename) ? fixed_filename : base_filename.concat(first_date_time,'_to_',lastest_date_time);
						const entries_in_data_file=activities_array.length;
						
						if (generate_csv_file)
						{
							filesystem.writeFile(folder.concat(data_filename,'.csv'), Generate_csv_file_contents(activities_array), error =>
							{
								if (error) { console.error('Unable to write file '+data_filename+'.csv. Error:'+error);
								process.exitCode = 1;											}
							});
							console.log('Written file '+data_filename+'.csv with '+entries_in_data_file+' entries');
							
							a_file_has_been_written=true;
						};
						
						if (generate_json_file)
						{
							filesystem.writeFile(folder.concat(data_filename,'.json'), JSON.stringify(activities_array,null,4), error =>
							{
								if (error) { console.error('Unable to write file '+data_filename+'.json. Error:'+error);
								process.exitCode = 1;											}
							});
							console.log('Written file '+data_filename+'.json with '+entries_in_data_file+' entries');
							
							a_file_has_been_written=true;
						};
						
						
						
						
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
							let day_this_entry = new Date(activities_array[log_entry][time_identifier]);
							
							
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
									const entries_in_data_file=current_day_logs_array.length;
									if (use_fixed_filename && periods===1) { data_filename=fixed_filename };
									
									if (generate_csv_file)
									{
										filesystem.writeFile(folder.concat(data_filename,'.csv'), Generate_csv_file_contents(current_day_logs_array), error =>
										{
											if (error) { console.error('Unable to write file '+data_filename+'.csv. Error:'+error);
											process.exitCode = 1;											}
										});
										console.log('Written file '+data_filename+'.csv with '+entries_in_data_file+' entries');
										
										a_file_has_been_written=true;
									};
									
									if (generate_json_file)
									{
										filesystem.writeFile(folder.concat(data_filename,'.json'), JSON.stringify(current_day_logs_array,null,4), error =>
										{
											if (error) { console.error('Unable to write file '+data_filename+'.json. Error:'+error);
											process.exitCode = 1;											}
										});
										console.log('Written file '+data_filename+'.json with '+entries_in_data_file+' entries');
										
										a_file_has_been_written=true;
									};
									
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
							
							let day_this_entry = new Date(activities_array[log_entry][time_identifier]);
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
									const entries_in_data_file=current_week_logs_array.length;
									if (use_fixed_filename && periods===1) { data_filename=fixed_filename };
									
									if (generate_csv_file)
									{
										filesystem.writeFile(folder.concat(data_filename,'.csv'), Generate_csv_file_contents(current_week_logs_array), error =>
										{
											if (error) { console.error('Unable to write file '+data_filename+'csv. Error:'+error);
											process.exitCode = 1;											}
										});
										console.log('Written file '+data_filename+'.csv with '+entries_in_data_file+' entries');
										
										a_file_has_been_written=true;
									};
									
									if (generate_json_file)
									{
										filesystem.writeFile(folder.concat(data_filename,'.json'), JSON.stringify(current_week_logs_array,null,4), error =>
										{
											if (error) { console.error('Unable to write file '+data_filename+'.json. Error:'+error);
											process.exitCode = 1;											}
										});
										console.log('Written file '+data_filename+'.json with '+entries_in_data_file+' entries');
										
										a_file_has_been_written=true;
									};
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
							let day_this_entry    = new Date(activities_array[log_entry][time_identifier]);
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
									const entries_in_data_file=current_month_logs_array.length;
									if (use_fixed_filename && periods===1) { data_filename=fixed_filename };
									
									if (generate_csv_file)
									{
										filesystem.writeFile(folder.concat(data_filename,'.csv'), Generate_csv_file_contents(current_month_logs_array), error =>
										{
											if (error) { console.error('Unable to write file '+data_filename+'.csv. Error:'+error);
											process.exitCode = 1;											}
										});
										console.log('Written file '+data_filename+'.csv with '+entries_in_data_file+' entries');
										
										a_file_has_been_written=true;
									};
									
									if (generate_json_file)
									{
										filesystem.writeFile(folder.concat(data_filename,'.json'), JSON.stringify(current_month_logs_array,null,4), error =>
										{
											if (error) { console.error('Unable to write file '+data_filename+'.json. Error:'+error);
											process.exitCode = 1;											}
										});
										console.log('Written file '+data_filename+'.json with '+entries_in_data_file+' entries');
										
										a_file_has_been_written=true;
									};
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
				
				if ((generate_json_file===false) && (generate_csv_file===false))
				{
					console.warn('Neither .csv or .json files will be created because the settings for each is set to false');
				}
				else if (!a_file_has_been_written)
				{
					// to help confusion why some logs are written or not...
					console.warn('No audit logs found that matches your request.');
					console.log();
					switch (option)
					{
						case 'oldestday':
						{
							console.log('\''+option+'\' requires at least 2 days\' worth of audit logs, otherwise it can\'t determine if that 1st day has completed or not.');
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
								console.log('\''+option+'\' requires audit events that occurred yesterday.');
								console.log();
								console.log('Requesting audit log downloads is a recorded audit event, so running this each day will result in a file per day.');
								console.log();
							}
							else
							{
								console.log('\''+option+'\' requires audit events that occurred before, during and since this period.');
								console.log();
								console.log('Requesting audit log downloads is a recorded audit event, so running this each day will result in a file per day.');
								console.log('Use \'oldestday\', \'eachfullday\' and \'currentday\' instead for now.');
								console.log();
							};						
							break;
						}
						case 'eachfullday':
						{
							console.log('\''+option+'\' requires at least 3 days\' worth of audit events, otherwise it can\'t determine if the 2nd day has completed or not.');
							console.log('Use \'oldestday\' and \'currentday\' instead.');
							console.log();
							break;
						}
						case 'oldestweek':
						{
							console.log('\''+option+'\' requires at least 2 weeks\' worth of audit events, otherwise it can\'t determine if that 1st week has completed or not.');
							console.log('Use \'currentweek\' instead.');
							console.log();
							break;
						}
						case 'lastfullweek':
						{
							console.log('\''+option+'\' requires audit events that occurred before, during and since this period.');
							console.log();
							console.log('Requesting audit log downloads is a recorded audit event, so running this each week will result in a file per week.');
							console.log('Use \'oldestweek\', \'eachfullweek\' and \'currentweek\' instead for now.');
							console.log();
							break;
						}
						case 'eachfullweek':
						{
							console.log('\''+option+'\' requires at least 3 weeks\' worth of audit events, otherwise it can\'t determine if the 2nd week has completed or not.')
							console.log('Use \'oldestweek\' and \'currentweek\' instead.');
							console.log();
							break;
						}
						case 'oldestmonth':
						{
							console.log('\''+option+'\' requires at least 2 months\' worth of audit events, otherwise it can\'t determine if that 1st month has completed or not.');
							console.log('Use \'currentmonth\' instead.');
							console.log();
							break;
						}
						case 'lastfullmonth':
						{
							console.log('\''+option+'\' requires audit events that occurred before, during and since this period.');
							console.log();
							console.log('Requesting audit log downloads is a recorded audit event, so running this each month will result in a file per month.');
							console.log('Use \'oldestmonth\', \'eachfullmonth\' and \'currentmonth\' instead for now.');
							console.log();
							break;
						}
						case 'eachfullmonth':
						{
							console.log('\''+option+'\' requires at least 3 months\' worth of audit events, otherwise it can\'t determine if the 2nd month has completed or not.');
							console.log('Use \'oldestmonth\' and \'currentmonth\' instead.');
							console.log();
							break;
						}
					}
					
				}
				else	
				{
					console.log();
					console.log('Audit logs contain personal data. Ensure you comply with local laws and secure this data appropriately');
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
