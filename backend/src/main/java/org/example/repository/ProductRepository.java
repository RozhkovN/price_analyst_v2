package org.example.repository;

import org.example.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByBarcodeIn(List<String> barcodes);

    // Новый метод для поиска всех товаров по штрихкоду
    List<Product> findByBarcode(String barcode);

    @Query("SELECT p FROM Product p WHERE p.barcode IN :barcodes ORDER BY p.barcode, p.priceWithVat ASC")
    List<Product> findByBarcodesOrderedByPrice(@Param("barcodes") List<String> barcodes);

    Optional<Product> findBySupplier_SupplierNameAndBarcode(String supplierName, String barcode);

    @Query("SELECT COUNT(p) FROM Product p")
    long countProducts();

    @Query("SELECT p FROM Product p WHERE p.supplier.supplierName = :supplierName")
    List<Product> findBySupplierName(@Param("supplierName") String supplierName);

    @Query("SELECT p FROM Product p JOIN FETCH p.supplier WHERE p.supplier.supplierName IN :supplierNames")
    List<Product> findBySupplierNameIn(@Param("supplierNames") java.util.Set<String> supplierNames);
}