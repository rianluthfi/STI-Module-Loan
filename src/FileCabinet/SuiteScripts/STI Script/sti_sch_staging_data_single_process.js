/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
 
 
define([
	'N/search', 
	'N/record', 
	'N/email', 
	'N/runtime', 
	'N/error', 
	'N/format', 
	'N/task', 
	'/SuiteScripts/STI Script/moment.js',
	'/SuiteScripts/STI Script/sti_modul'
	],
    function(search, record, email, runtime, error, format, task, moment, sti_modul) {
		
		var myScript = runtime.getCurrentScript();
		
		var parameter = runtime.getCurrentScript().getParameter({
            name: 'custscript_sti_sch_param_id_sd'
        });
		
		var suffixBillingCycle		= ':d';
		var prefixSupplierTransfer	= 'T+';
		
		
		
        function execute(context) {
			
			var tempError = [];
			
			var dataparam = JSON.parse(parameter);
			
			var id_staging = dataparam[0].id_staging;
			var id_bg_process = dataparam[0].id_bg_process;
			
			
			sti_modul.updateBGProcess(id_bg_process, 2, '', '', '', '', '');
			
	
			var data =  sti_modul.getStagingData(id_staging, suffixBillingCycle, prefixSupplierTransfer);
			var datastaging = JSON.parse(data);
			
			var datalender 	= JSON.parse(sti_modul.getLenderInformation(datastaging.lender))[0];
			
			var id_transaction_type = sti_modul.getTransactionType(datastaging.transaction_type);

			var checkRelatedJournalStagingData = sti_modul.checkRelatedJournalStagingData(id_staging);

			if (checkRelatedJournalStagingData.relatedJournalId == ''){

				// Do Validation Staging Data
				tempError = sti_modul.validationData(data);

				if (tempError.length == 0){
					
					// Staging Data is Valid 
					
					log.debug('datastaging.template_type '+typeof datastaging.template_type, datastaging.template_type);
					
					if (datastaging.template_type != ''){
						
						// If template_type already set on Staging Data, Check with master template_type
						var id_template = sti_modul.checkTemplateTypeIdByName(datastaging.template_type);
						
						if (id_template > 0){
							
							sti_modul.runProcessWithTemplateId(
								id_template,
								id_bg_process, 
								data,
								id_staging,
								datastaging.loan_id,
								id_transaction_type,
								datastaging.transaction_type,
								datastaging.collection_account,
								datalender.pph_tax_account,
								datalender.len_acc_coa,
								datastaging.repayment_date,
								datastaging.delivery_date
							);
						}
						else{
							
							// No Suitable template_type with that name
							sti_modul.updateBGProcess(id_bg_process, 4, '', '', '', '', 'Cannot find template_type with name '+datastaging.template_type);
							
						}
					}
					else{
						
						// Search Suitable Template Type by Condition
						var id_template = sti_modul.getTemplateTypeByCondition(
							datastaging.subsidiary,
							datastaging.template_type, 
							datalender.type, 
							datastaging.supplier_transfer, 
							id_transaction_type, 
							datastaging.loan_id,
							id_bg_process
						);
						
						if (id_template > 0){
							
							
							sti_modul.runProcessWithTemplateId(
								id_template,
								id_bg_process, 
								data,
								id_staging,
								datastaging.loan_id,
								id_transaction_type,
								datastaging.transaction_type,
								datastaging.collection_account,
								datalender.pph_tax_account,
								datalender.len_acc_coa,
								datastaging.repayment_date,
								datastaging.delivery_date
							);
						}
						else{
							
							// Error because No Suitable Template
							sti_modul.updateBGProcess(id_bg_process, 4, '', '', '', '', 'No Suitable id_template, please check master template_type');
							
						}
						
					}
					
				}else{
					
					// There is Invalid Staging Data
					
					var error = sti_modul.extractError(tempError);
					sti_modul.updateBGProcess(id_bg_process, 4, '', '', '', '', error);
					log.debug('error Validation Data', error);
				}
			}else{

				sti_modul.updateBGProcess(id_bg_process, 4, '', '', '', '', 
					'This staging data already process (Calculation: '+
					checkRelatedJournalStagingData.relatedCalculationText+' ['+checkRelatedJournalStagingData.relatedCalculationId+']'+
					'Related Journal: '+checkRelatedJournalStagingData.relatedJournalText+' ['+checkRelatedJournalStagingData.relatedJournalId+'])'
				);
				
				log.debug('error data staging already process', 
					'This staging data already process (Calculation: '+
					checkRelatedJournalStagingData.relatedCalculationText+' ['+checkRelatedJournalStagingData.relatedCalculationId+']'+
					'Related Journal: '+checkRelatedJournalStagingData.relatedJournalText+' ['+checkRelatedJournalStagingData.relatedJournalId+'])'
				);
			}
		}
		
		return {
            execute: execute
        };
    }
);