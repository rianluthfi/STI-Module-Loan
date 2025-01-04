/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define([
			'N/ui/serverWidget',
			'N/runtime',
			'/SuiteScripts/STI Script/sti_modul'
		], 
	function(
			serverWidget,
			runtime,
			sti_modul
	) {
		
	// var CLIENT_SCRIPT_FILE_ID = 405;
	
	var scriptObj = runtime.getCurrentScript();
	var scriptid = scriptObj.id;
	var deploymentid = scriptObj.deploymentId;
	
	var scriptid_main = 'customscript_sti_sl_process_staging_data';
	var deployid_main = 'customdeploy_sti_sl_process_staging_data';
	
	
    function onRequest(context) {
       
		var form = serverWidget.createForm({
			title : 'Status Process Staging Data'
		});
		
		// form.clientScriptFileId = CLIENT_SCRIPT_FILE_ID;
		form.clientScriptModulePath = 'SuiteScripts/STI Script/sti_cs_view_process_staging_data.js';
		
		if(context.request.method == 'GET'){
			
			
			var sublist = form.addSublist({
				id : 'sublist',
				type : serverWidget.SublistType.LIST,
				label : 'Status Process'
			});
			
			sublist.addRefreshButton();
			
			var linkField = sublist.addField({
				id: 'custpage_link',
				type: serverWidget.FieldType.URL,
				label: '#'
			});
			linkField.linkText = 'View';
			
			// var id_bg_process = sublist.addField({
				// id: 'custpage_id_bg_process',
				// type: serverWidget.FieldType.TEXT,
				// label: 'ID BG Process'
			// });
			var date_created = sublist.addField({
				id: 'custpage_date_created',
				type: serverWidget.FieldType.TEXT,
				label: 'Date Created'
			});
			var id_staging_data = sublist.addField({
				id: 'custpage_id_staging_data',
				type: serverWidget.FieldType.TEXT,
				label: 'Staging Data'
			});
			var bg_process_status = sublist.addField({
				id: 'custpage_bg_process_status',
				type: serverWidget.FieldType.TEXT,
				label: 'Status'
			});
			var template_type = sublist.addField({
				id: 'custpage_template_type',
				type: serverWidget.FieldType.TEXT,
				label: 'Template Type'
			});
			var calculation_record = sublist.addField({
				id: 'custpage_calculation_record',
				type: serverWidget.FieldType.TEXT,
				label: 'Calculation Record'
			});
			var journal_1st = sublist.addField({
				id: 'custpage_journal_1st',
				type: serverWidget.FieldType.TEXT,
				label: '1st Journal'
			});
			var journal_2nd = sublist.addField({
				id: 'custpage_journal_2nd',
				type: serverWidget.FieldType.TEXT,
				label: '2nd Journal'
			});
			var error_message = sublist.addField({
				id: 'custpage_error_message',
				type: serverWidget.FieldType.TEXT,
				label: 'Error Message'
			});
			
			var btn_back_to_process = form.addButton({
				id : 'custpage_btn_to_process',
				label : 'Back to Process',
				functionName : "goToSuitelet('" + scriptid_main + "','"+ deployid_main +"')"
			});
			
			
			var data = sti_modul.getSearchBGProcess();
			
			if (data.length > 0){
				
				for (var i = 0; i < data.length; i++){
					
					var internalid			= data[i].internalid;
					var created				= data[i].created;
					var id_staging_data		= data[i].id_staging_data;
					var bg_status			= data[i].bg_status;
					var template_type		= data[i].template_type;
					var calculation_record	= data[i].calculation_record;
					var journal_1st			= data[i].journal_1st;
					var journal_2nd			= data[i].journal_2nd;
					var error_message		= data[i].error_message;
					
					sublist.setSublistValue({
						id : 'custpage_link',
						line : i,
						value : '/app/common/custom/custrecordentry.nl?rectype=83&id='+internalid
					});
					
					// if (internalid != ''){
						// sublist.setSublistValue({
							// id : 'custpage_id_bg_process',
							// line : i,
							// value : internalid
						// });
					// }
					if (created != ''){
						sublist.setSublistValue({
							id : 'custpage_date_created',
							line : i,
							value : created
						});
					}
					if (id_staging_data != ''){
						sublist.setSublistValue({
							id : 'custpage_id_staging_data',
							line : i,
							value : id_staging_data
						});
					}
					if (bg_status != ''){
						sublist.setSublistValue({
							id : 'custpage_bg_process_status',
							line : i,
							value : bg_status
						});
					}
					if (template_type != ''){
						sublist.setSublistValue({
							id : 'custpage_template_type',
							line : i,
							value : template_type
						});
					}
					if (calculation_record != ''){
						sublist.setSublistValue({
							id : 'custpage_calculation_record',
							line : i,
							value : calculation_record
						});
					}
					if (journal_1st != ''){
						sublist.setSublistValue({
							id : 'custpage_journal_1st',
							line : i,
							value : journal_1st
						});
					}
					if (journal_2nd != ''){
						sublist.setSublistValue({
							id : 'custpage_journal_2nd',
							line : i,
							value : journal_2nd
						});
					}
					if (error_message != ''){
						sublist.setSublistValue({
							id : 'custpage_error_message',
							line : i,
							value : error_message
						});
					}
					
				}
				
			}
			
			log.debug('data '+typeof data, data);
			
			log.debug('data.length '+typeof data.length, data.length);
			
			context.response.writePage(form);
		}
		else{
			
			
		}
    }

    return {
        onRequest: onRequest
    };
});