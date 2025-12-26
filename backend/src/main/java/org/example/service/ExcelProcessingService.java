package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.example.dto.ExcelUploadResponse;
import org.example.entity.Product;
import org.example.entity.Supplier;
import org.example.repository.ProductRepository;
import org.example.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.EntityManager;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExcelProcessingService {

    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final EntityManager entityManager;

    @Transactional
    public ExcelUploadResponse processSupplierDataFile(MultipartFile file) throws Exception {
        long startTime = System.currentTimeMillis();

        ExcelUploadResponse response = ExcelUploadResponse.builder().build();
        int newRecords = 0;
        int updatedRecords = 0;
        int unchangedRecords = 0;
        int failed = 0;
        int skipped = 0;

        Set<String> fileDuplicateCheckCache = new HashSet<>();
        Map<String, Supplier> supplierCache = new HashMap<>();
        Map<String, Product> productCache = new HashMap<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            // Определяем индексы колонок
            int supplierNameCol = findColumnIndex(sheet, "Наименование поставщика");
            int barcodeCol = findColumnIndex(sheet, "Штрих код");
            int productNameCol = findColumnIndex(sheet, "Наименование");
            int priceCol = findColumnIndex(sheet, "ПЦ с НДС опт");

            if (supplierNameCol == -1 || barcodeCol == -1 || productNameCol == -1 || priceCol == -1) {
                throw new IllegalArgumentException("Не найдены все необходимые заголовки в файле. Убедитесь, что файл предназначен для загрузки данных поставщиков, а не для анализа цен.");
            }

            log.info("Detected columns - SupplierName: {}, Barcode: {}, ProductName: {}, Price: {}", supplierNameCol, barcodeCol, productNameCol, priceCol);

            // Подготовка поставщиков перед обработкой
            int totalRows = sheet.getLastRowNum();
            Set<String> suppliersInFile = new HashSet<>();
            for (int i = 1; i <= totalRows; i++) {
                Row row = sheet.getRow(i);
                if (row != null) {
                    String supplierName = getCellStringValue(row.getCell(supplierNameCol));
                    if (supplierName != null && !supplierName.trim().isEmpty()) {
                        suppliersInFile.add(supplierName.trim());
                    }
                }
            }
            
            // Массовая загрузка поставщиков
            ensureSuppliersExist(suppliersInFile);
            
            // Загрузка существующих товаров в кэш (оптимизировано)
            loadExistingProductsToCache(suppliersInFile, productCache);

            List<Product> batchProducts = new ArrayList<>();
            int batchSize = 5000;

            for (int i = 1; i <= totalRows; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                try {
                    String supplierName = getCellStringValue(row.getCell(supplierNameCol));
                    String barcode = getCellStringValue(row.getCell(barcodeCol));
                    String productName = getCellStringValue(row.getCell(productNameCol));
                    Double price = getCellNumericValue(row.getCell(priceCol));

                    if (supplierName == null || supplierName.trim().isEmpty() || barcode == null || barcode.trim().isEmpty()) {
                        throw new IllegalArgumentException("Не указан поставщик или штрихкод");
                    }

                    supplierName = supplierName.trim();
                    barcode = barcode.trim();
                    if (productName != null) productName = productName.trim();

                    // Проверка дубликата в файле
                    String duplicateKey = supplierName + "|" + barcode;
                    if (fileDuplicateCheckCache.contains(duplicateKey)) {
                        skipped++;
                        continue;
                    }
                    fileDuplicateCheckCache.add(duplicateKey);

                    Supplier supplier = supplierCache.computeIfAbsent(supplierName, 
                        name -> supplierRepository.findById(name).orElse(null));

                    // Проверка существования в кэше
                    String cacheKey = supplierName + "|" + barcode;
                    Product existingProduct = productCache.get(cacheKey);

                    if (existingProduct != null) {
                        // Проверяем изменения ПЕРЕД добавлением в batch
                        boolean priceChanged = !Objects.equals(existingProduct.getPriceWithVat(), price);
                        boolean nameChanged = !Objects.equals(existingProduct.getProductName(), productName);

                        if (priceChanged || nameChanged) {
                            // Только если есть реальные изменения - обновляем
                            existingProduct.setProductName(productName);
                            existingProduct.setPriceWithVat(price);
                            batchProducts.add(existingProduct);
                            updatedRecords++;
                        } else {
                            unchangedRecords++;
                        }
                    } else {
                        Product newProduct = Product.builder()
                                .supplier(supplier)
                                .barcode(barcode)
                                .productName(productName)
                                .priceWithVat(price)
                                .build();
                        batchProducts.add(newProduct);
                        newRecords++;
                    }

                    // Сохраняем батч и очищаем Hibernate кэш
                    if (batchProducts.size() >= batchSize) {
                        productRepository.saveAll(batchProducts);
                        entityManager.flush(); // Выполняем все SQL операции
                        entityManager.clear(); // Очищаем кэш Hibernate для экономии памяти
                        batchProducts.clear();
                    }
                } catch (Exception e) {
                    failed++;
                    log.warn("Ошибка обработки строки {}: {}", i + 1, e.getMessage());
                }
            }

            // Сохраняем оставшиеся товары
            if (!batchProducts.isEmpty()) {
                productRepository.saveAll(batchProducts);
                entityManager.flush();
            }

            long processingTime = System.currentTimeMillis() - startTime;
            String message = String.format("Добавлено: %d, обновлено: %d, без изменений: %d, пропущено дубликатов: %d, ошибок: %d. Время: %d мс",
                    newRecords, updatedRecords, unchangedRecords, skipped, failed, processingTime);

            response.setSuccess(true);
            response.setMessage(message);
            response.setNewRecords(newRecords);
            response.setUpdatedRecords(updatedRecords);
            response.setUnchangedRecords(unchangedRecords);
            response.setProcessedRecords(newRecords + updatedRecords);
            response.setFailedRecords(failed);

            log.info("Обработка завершена: {} (Обработано {} записей/сек)", message, 
                Math.round(totalRows / (processingTime / 1000.0)));

            return response;
        }
    }

    /**
     * Загрузить все существующие товары в кэш для быстрого поиска
     */
    private void loadExistingProductsToCache(Set<String> supplierNames, Map<String, Product> cache) {
        log.info("Загрузка существующих товаров в кэш для {} поставщиков", supplierNames.size());
        long cacheLoadStart = System.currentTimeMillis();
        
        // Загружаем товары батчами по поставщикам
        for (String supplierName : supplierNames) {
            List<Product> products = productRepository.findBySupplierName(supplierName);
            for (Product product : products) {
                String key = supplierName + "|" + product.getBarcode();
                cache.put(key, product);
            }
        }
        
        log.info("Загрузка кэша завершена за {} мс. Загружено {} товаров", 
            System.currentTimeMillis() - cacheLoadStart, cache.size());
    }

    /**
     * Убедитесь, что все поставщики существуют в БД
     */
    private void ensureSuppliersExist(Set<String> supplierNames) {
        log.info("Проверка существования {} поставщиков", supplierNames.size());
        
        // Получить существующих поставщиков
        List<Supplier> existingSuppliers = supplierRepository.findAllById(supplierNames);
        Set<String> existingSupplierNames = existingSuppliers.stream()
            .map(Supplier::getSupplierName)
            .collect(Collectors.toSet());

        // Создать недостающих поставщиков
        List<Supplier> newSuppliers = supplierNames.stream()
            .filter(name -> !existingSupplierNames.contains(name))
            .map(name -> Supplier.builder().supplierName(name).build())
            .collect(Collectors.toList());

        if (!newSuppliers.isEmpty()) {
            log.info("Создание {} новых поставщиков", newSuppliers.size());
            supplierRepository.saveAll(newSuppliers);
        }
    }

    private int findColumnIndex(Sheet sheet, String expectedHeader) {
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) return -1;

        String normalizedExpected = expectedHeader.trim().replaceAll("\\s+", "").toLowerCase();

        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            String cellValue = getCellStringValue(headerRow.getCell(i));
            if (cellValue != null) {
                String normalizedCell = cellValue.trim().replaceAll("\\s+", "").toLowerCase();
                if (normalizedCell.equals(normalizedExpected)) {
                    log.debug("Найдена колонка '{}' в позиции {}", expectedHeader, i);
                    return i;
                }
            }
        }
        log.warn("Не найдена колонка '{}'", expectedHeader);
        return -1;
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> null;
        };
    }

    private Double getCellNumericValue(Cell cell) {
        if (cell == null) return 0.0;
        return switch (cell.getCellType()) {
            case NUMERIC -> cell.getNumericCellValue();
            case STRING -> {
                String value = cell.getStringCellValue().replace(",", ".").trim();
                try {
                    yield Double.parseDouble(value);
                } catch (NumberFormatException e) {
                    log.warn("Ошибка парсинга цены: '{}'", value);
                    yield 0.0;
                }
            }
            default -> 0.0;
        };
    }
}