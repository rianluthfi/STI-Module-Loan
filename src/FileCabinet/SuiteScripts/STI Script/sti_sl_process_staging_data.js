/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
 
 
var SEARCH_ID = 'customsearch_sti_st_data_need_to_process';		// Staging Data - Need To Process
var CLIENT_SCRIPT_FILE_ID = 296;								// sti_cs_process_staging_data.js
var LIMIT_USAGE = 50;


define(['N/ui/serverWidget', 
		'N/search', 
		'N/url', 
		'N/record', 
		'N/currentRecord', 
		'N/task', 
		'N/redirect', 
		'N/runtime', 
		'N/format', 
		'N/config',
		'/SuiteScripts/STI Script/moment.js',
		'/SuiteScripts/STI Script/sti_modul.js',
		'/SuiteScripts/STI Script/sti_modul_sch.js'
		],

function(serverWidget, search, url, record, currentRecord, task, redirect, runtime, format, config, moment, sti_modul, sti_modul_sch) {

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
	 
	var myScript = runtime.getCurrentScript();
	
	
		
	var SCRIPT_ID 				= myScript.id;
	var DEPLOYEMENT_ID 			= myScript.deploymentId;
	var PAGE_SIZE				= 50;
	 
	
	
    function onRequest(context) {
		
		var form = serverWidget.createForm({
			title : 'Process Staging Data'
		});
		
		var myScript = runtime.getCurrentScript();
			
		if(context.request.method == 'GET'){
			
			
			// form.clientScriptFileId = CLIENT_SCRIPT_FILE_ID;
			form.clientScriptModulePath = 'SuiteScripts/STI Script/sti_cs_process_staging_data.js';
			
			
			// Get parameters
            var pageId = parseInt(context.request.parameters.page);
			
            var scriptId = context.request.parameters.script;
            var deploymentId = context.request.parameters.deploy;
			
			var transactiontype = context.request.parameters.transactiontype;
			var loanid = context.request.parameters.loanid;
			var deliverydate = context.request.parameters.deliverydate;
			var repaymentdate = context.request.parameters.repaymentdate;
			var suppliertransfer = context.request.parameters.suppliertransfer;
			var lender = context.request.parameters.lender;
			
			var collectionbank = context.request.parameters.collectionbank;
			var collectiontype = context.request.parameters.collectiontype;
			
			
			if (!transactiontype || transactiontype == '' || transactiontype < 0){
				
				transactiontype = '';
			}
			
			if (!repaymentdate || repaymentdate == '' || repaymentdate < 0){
				
				repaymentdate = '';
			}
			
			if (!deliverydate || deliverydate == '' || deliverydate < 0){
				
				
				
				// var timezone = config.load({type: config.Type.USER_PREFERENCES}).getValue({fieldId: "TIMEZONE"})

				// var currentTime = new Date();

				// var deliveryDate = format.format({
					// value: currentTime,
					// type: format.Type.DATE,
					// timezone: format.Timezone.timezone
				// });
				
				deliverydate = '';
			}
			
			if (!suppliertransfer || suppliertransfer == '' || suppliertransfer < 0){
				
				suppliertransfer = '';
			}
			
			if (!lender || lender == '' || lender < 0){
				
				lender = '';
			}
			
			if (!loanid || loanid == '' || loanid < 0){
				
				loanid = '';
			}
			
			if (!collectionbank || collectionbank == '' || collectionbank < 0){
				
				collectionbank = '';
			}
			
			if (!collectiontype || collectiontype == '' || collectiontype < 0){
				
				collectiontype = '';
			}
			
			// Set pageId to correct value if out of index
            if (!pageId || pageId == '' || pageId < 0){
                pageId = 0;
			}
            else if (pageId >= pageCount){
                pageId = pageCount - 1;
			}
			
			var data_search = sti_modul.searchDataNeedToProcess(
						PAGE_SIZE, 
						transactiontype, 
						deliverydate, 
						repaymentdate, 
						loanid, 
						suppliertransfer, 
						lender, 
						collectionbank, 
						collectiontype
			);
			
			var sublist = form.addSublist({
				id : 'custpage_staging_data_list',
				type : serverWidget.SublistType.LIST,
				label : 'Staging Data '+parseInt(data_search.count)
			});
			
			sublist.addField({
				id: 'checkbox',
				type: serverWidget.FieldType.CHECKBOX,
				label: 'Check'
			});
			
			sublist.addField({
                id : 'number',
                label : 'No',
                type : serverWidget.FieldType.TEXT
            });
			
			var linkField = sublist.addField({
				id: 'link',
				type: serverWidget.FieldType.URL,
				label: '#'
			});
			
			linkField.linkText = 'View';
			
			sublist.addField({
                id : 'id',
                label : 'Internal ID',
                type : serverWidget.FieldType.TEXT
            }).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.HIDDEN
			});
			
			sublist.addField({
                id : 'transaction_type',
                label : 'Transation Type',
                type : serverWidget.FieldType.TEXT
            });
			
			sublist.addField({
                id : 'loan_id',
                label : 'Loan ID',
                type : serverWidget.FieldType.TEXT
            });
			
			sublist.addField({
                id : 'delivery_date',
                label : 'Delivery Date',
                type : serverWidget.FieldType.DATE
            });
			
			sublist.addField({
                id : 'loan_amount',
                label : 'Loan Amount',
                type : serverWidget.FieldType.CURRENCY
            });
			
			sublist.addField({
                id : 'repayment_date',
                label : 'Repayment Date',
                type : serverWidget.FieldType.DATE
            });
			
			sublist.addField({
                id : 'due_date_lender',
                label : 'Due Date Lender',
                type : serverWidget.FieldType.DATE
            });
			
			sublist.addField({
                id : 'paid_amount',
                label : 'Paid Amount',
                type : serverWidget.FieldType.CURRENCY
            });
			
			sublist.addField({
                id : 'discount',
                label : 'Discount',
                type : serverWidget.FieldType.CURRENCY
            });
			
			sublist.addField({
                id : 'cashback',
                label : 'Cashback',
                type : serverWidget.FieldType.CURRENCY
            });
			
			sublist.addField({
                id : 'late_fee',
                label : 'Late Fee',
                type : serverWidget.FieldType.CURRENCY
            });
			
			sublist.addField({
                id : 'waive_fee',
                label : 'Waive Fee',
                type : serverWidget.FieldType.CURRENCY
            });
			
			sublist.addField({
                id : 'lender',
                label : 'lender',
                type : serverWidget.FieldType.TEXT
            });
			
			sublist.addField({
                id : 'supplier_transfer',
                label : 'Supplier Transfer',
                type : serverWidget.FieldType.TEXT
            });
			
			sublist.addField({
                id : 'collection_bank',
                label : 'Collection Bank',
                type : serverWidget.FieldType.TEXT
            });
			
			sublist.addField({
                id : 'collection_type',
                label : 'Collection Type',
                type : serverWidget.FieldType.TEXT
            });
			
			
			
			var pageCount = Math.ceil(data_search.count / PAGE_SIZE);
			 
			 // Add drop-down and options to navigate to specific page
            var selectOptions = form.addField({
                    id : 'custpage_pageid',
                    label : 'Page Index',
                    type : serverWidget.FieldType.SELECT
                });

            for (i = 0; i < pageCount; i++) {
                if (i == pageId) {
                    selectOptions.addSelectOption({
                        value : 'pageid_' + i,
                        text : ((i * PAGE_SIZE) + 1) + ' - ' + ((i + 1) * PAGE_SIZE),
                        isSelected : true
                    });
                } else {
                    selectOptions.addSelectOption({
                        value : 'pageid_' + i,
                        text : ((i * PAGE_SIZE) + 1) + ' - ' + ((i + 1) * PAGE_SIZE)
                    });
                }
            }


			var transactionTypeField = form.addField({
				id : 'custpage_transaction_type',
				type : serverWidget.FieldType.TEXT,
				label : 'Transaction Type',
			});
			
			if (transactiontype != ''){
				transactionTypeField.defaultValue = transactiontype;
			}
			
			var deliveryDateField = form.addField({
				id : 'custpage_delivery_date',
				type : serverWidget.FieldType.DATE,
				label : 'Delivery Date',
			});
			
			if (deliverydate != ''){
				deliveryDateField.defaultValue = deliverydate;
			}
			
			var repaymentDateField = form.addField({
				id : 'custpage_repayment_date',
				type : serverWidget.FieldType.DATE,
				label : 'Repayment Date',
			});
			
			if (repaymentdate != ''){
				repaymentDateField.defaultValue = repaymentdate;
			}
			
			var loanIDField = form.addField({
				id : 'custpage_loan_id',
				type : serverWidget.FieldType.TEXT,
				label : 'Loan ID',
			});
			
			if (loanid != ''){
				loanIDField.defaultValue = loanid;
			}
			
			var supplierTransferField = form.addField({
				id : 'custpage_supplier_transfer',
				type : serverWidget.FieldType.TEXT,
				label : 'Supplier Transfer',
			});
			
			if (suppliertransfer != ''){
				supplierTransferField.defaultValue = suppliertransfer;
			}
			
			var lenderField = form.addField({
				id : 'custpage_lender',
				type : serverWidget.FieldType.TEXT,
				label : 'Lender',
			});
			
			if (lender != ''){
				lenderField.defaultValue = lender;
			}
			
			var collectionBankField = form.addField({
				id : 'custpage_collection_bank',
				type : serverWidget.FieldType.TEXT,
				label : 'Collection Bank',
			});
			
			if (collectionbank != ''){
				collectionBankField.defaultValue = collectionbank;
			}
			
			var collectionTypeField = form.addField({
				id : 'custpage_collection_type',
				type : serverWidget.FieldType.TEXT,
				label : 'Collection Type',
			});
			
			if (collectiontype != ''){
				collectionTypeField.defaultValue = collectiontype;
			}
			
			
			if (data_search.count > 0){
				
				var addResults = fetchSearchResult(data_search, pageId);
				// Set data returned to columns
				var j = 0;
				addResults.forEach(function (result) {
					
					sublist.setSublistValue({
						id : 'id',
						line : j,
						value : result.id
					});
					
					sublist.setSublistValue({
						id : 'number',
						line : j,
						value : parseInt(j+1).toString()
					});
					
					sublist.setSublistValue({
						id : 'link',
						line : j,
						value : '/app/common/custom/custrecordentry.nl?rectype=85&id='+result.id+'&whence='
					});
					
					sublist.linkText = 'NetSuite';
					
					if (result.transaction_type != ''){
						sublist.setSublistValue({
							id : 'transaction_type',
							line : j,
							value : result.transaction_type
						});
					}
					
					if (result.loan_id != ''){
						sublist.setSublistValue({
							id : 'loan_id',
							line : j,
							value : result.loan_id
						});
					}
					
					if (result.delivery_date != ''){
						sublist.setSublistValue({
							id : 'delivery_date',
							line : j,
							value : result.delivery_date
						});
					}
					
					if (result.loan_amount != ''){
						sublist.setSublistValue({
							id : 'loan_amount',
							line : j,
							value : result.loan_amount
						});
					}
					
					if (result.repayment_date != ''){
						sublist.setSublistValue({
							id : 'repayment_date',
							line : j,
							value : result.repayment_date
						});
					}
					
					if (result.due_date_lender != ''){
						sublist.setSublistValue({
							id : 'due_date_lender',
							line : j,
							value : result.due_date_lender
						});
					}
					
					if (result.paid_amount != ''){
						sublist.setSublistValue({
							id : 'paid_amount',
							line : j,
							value : result.paid_amount
						});
					}
					
					if (result.discount != ''){
						sublist.setSublistValue({
							id : 'discount',
							line : j,
							value : result.discount
						});
					}
					
					if (result.cashback != ''){
						sublist.setSublistValue({
							id : 'cashback',
							line : j,
							value : result.cashback
						});
					}
					
					if (result.late_fee != ''){
						sublist.setSublistValue({
							id : 'late_fee',
							line : j,
							value : result.late_fee
						});
					}
					
					if (result.waive_fee != ''){
						sublist.setSublistValue({
							id : 'waive_fee',
							line : j,
							value : result.waive_fee
						});
					}
					
					if (result.lender!= ''){
						sublist.setSublistValue({
							id : 'lender',
							line : j,
							value : result.lender
						});
					}
					
					if (result.supplier_transfer!= ''){
						sublist.setSublistValue({
							id : 'supplier_transfer',
							line : j,
							value : result.supplier_transfer
						});
					}
					
					if (result.collection_bank!= ''){
						sublist.setSublistValue({
							id : 'collection_bank',
							line : j,
							value : result.collection_bank
						});
					}
					
					if (result.collection_type!= ''){
						sublist.setSublistValue({
							id : 'collection_type',
							line : j,
							value : result.collection_type
						});
					}

					j++
				});
				
				sublist.addMarkAllButtons();
				form.addSubmitButton({
					label: 'Process Staging Data'
				});
			}
			
			context.response.writePage(form);
			
			
		}else{
			
			var request = context.request;
			
			var count = context.request.getLineCount({
				group: 'custpage_staging_data_list'
			});
			
			log.debug('count',count);


			var data = new Array();
			
			for (var i = 0; i < count; i++) {
				
				var checkboxTransaction = context.request.getSublistValue({
					group: 'custpage_staging_data_list',
					name: 'checkbox',
					line: i
				});
				
				log.debug('checkboxTransaction',checkboxTransaction);
				
				if (checkboxTransaction == 'T') {
					var internalId = context.request.getSublistValue({
						group: 'custpage_staging_data_list',
						name: 'id',
						line: i
					});
					
					data.push(parseInt(internalId));
				}
			}
			
			log.debug('data', data);
			
			if (data.length > 0){
				
				sti_modul_sch.runSchBGProcessStagingData(data);
			
				redirect.toSuitelet({
					scriptId: '268',		// STI SL View BG Process Staging Data
					deploymentId: '1'
				});
				
			}
			
			else{
				
				redirect.toSuitelet({
					scriptId: SCRIPT_ID,
					deploymentId: DEPLOYEMENT_ID
				});
				
			}
			
			
		}
    }

    return {
        onRequest: onRequest
    };
	
	
	

    function fetchSearchResult(pagedData, pageIndex) {

        var searchPage = pagedData.fetch({
                index : pageIndex
            });

        var results = new Array();

        searchPage.data.forEach(function (result) {
			
            var internalId = result.id;
			
			var transaction_type = result.getValue({
				name : 'custrecord_sti_transaction_type'
            });
			
			var loan_id = result.getValue({
				name : 'custrecord_sti_loan_id'
            });
			
			var delivery_date = result.getValue({
				name : 'custrecord_sti_delivery_date'
            });
			
			var loan_amount = result.getValue({
				name : 'custrecord_sti_loan_amount'
            });
			
			var repayment_date = result.getValue({
				name : 'custrecord_sti_repayment_date'
            });
			
			var due_date_lender = result.getValue({
				name : 'custrecord_sti_due_date_lender'
            });
			
			var paid_amount = result.getValue({
				name : 'custrecord_sti_paid_amount'
            });
			
			var discount = result.getValue({
				name : 'custrecord_sti_discount'
            });
			
			var cashback = result.getValue({
				name : 'custrecord_sti_cashback'
            });
			
			var late_fee = result.getValue({
				name : 'custrecord_sti_late_fee'
            });
			
			var waive_fee = result.getValue({
				name : 'custrecord_sti_waive_fee'
            });
			
			var lender = result.getValue({
				name : 'custrecord_sti_lender'
            });
			
			var supplier_transfer = result.getValue({
				name : 'custrecord_sti_supplier_transfer'
            });

            var status_disbursement = result.getText({
				name : 'custrecord_sti_status_disbursement'
            });
			
			var collection_bank = result.getValue({
				name : 'custrecord_sti_collection_bank'
            });
			
			var collection_type = result.getValue({
				name : 'custrecord_sti_collection_type'
            });

            results.push({
                "id" : internalId,
				"transaction_type" 		: transaction_type,
				"loan_id" 				: loan_id,
				"delivery_date" 		: delivery_date,
				"loan_amount" 			: loan_amount,
				"repayment_date" 		: repayment_date,
				"due_date_lender"		: due_date_lender,
				"paid_amount" 			: paid_amount,
				"discount" 				: discount,
				"cashback" 				: cashback,
				"late_fee" 				: late_fee,
				"waive_fee" 			: waive_fee,
				"lender" 				: lender,
				"supplier_transfer" 	: supplier_transfer,
                "status_disbursement" 	: status_disbursement,
				"collection_bank"		: collection_bank,
				"collection_type"		: collection_type
            });
        });
        return results;
    }
	
	function getTotalData(SEARCH_ID, transactionType, deliveryDate, repaymentDate, supplierTransfer, lender, loanID){
		var mySearch = search.load({
			id: SEARCH_ID
		});
		
		var filters = mySearch.filters; //reference Search.filters object to a new variable

		if (deliveryDate != ''){
			
			var filterOne = search.createFilter({ //create new filter
				name: 'custrecord_sti_delivery_date',
				operator: search.Operator.IS,
				values: deliveryDate
			});
			
			filters.push(filterOne); //add the filter using .push() method
		}
		
		if (supplierTransfer != ''){
			
			log.debug('add filter supplierTransfer');
			
			var filterTwo = search.createFilter({ //create new filter
				name: 'custrecord_sti_supplier_transfer',
				operator: search.Operator.IS,
				values: supplierTransfer
			});
			
			filters.push(filterTwo); //add the filter using .push() method
		}
		
		if (lender != ''){
			
			log.debug('add filter lender');
			
			var filterThree = search.createFilter({ //create new filter
				name: 'custrecord_sti_lender',
				operator: search.Operator.IS,
				values: lender
			});
			
			filters.push(filterThree); //add the filter using .push() method
		}
		
		if (loanID != ''){
			
			log.debug('add filter loanID');
			
			var filterFour = search.createFilter({ //create new filter
				name: 'custrecord_sti_loan_id',
				operator: search.Operator.IS,
				values: loanID
			});
			
			filters.push(filterFour); //add the filter using .push() method
		}
		
		if (transactionType != ''){
			
			var filterFive = search.createFilter({ //create new filter
				name: 'custrecord_sti_transaction_type',
				operator: search.Operator.IS,
				values: transactionType
			});
			
			filters.push(filterFive); //add the filter using .push() method
		}
		
		if (repaymentDate != ''){
			
			var filterSix = search.createFilter({ //create new filter
				name: 'custrecord_sti_repayment_date',
				operator: search.Operator.IS,
				values: repaymentDate
			});
			
			filters.push(filterSix); //add the filter using .push() method
		}

		var searchResult = mySearch.run().getRange({
			start: 0,
			end: 1000
		});
		
		log.debug(searchResult.length);
		
		return searchResult.length;
	}
});